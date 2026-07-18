import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom, timeout } from 'rxjs';
import { initializeApp, getApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  getMultiFactorResolver,
  multiFactor,
  OAuthProvider,
  signInWithPopup,
  GoogleAuthProvider,
  linkWithPopup,
  unlink,
  updateEmail,
  updatePassword,
} from 'firebase/auth';

import { SessionApiService } from './session-api.service';
import { SessionWsService } from './session-ws.service';

/** Expected MFA challenge — not an application error. */
const isMfaRequiredError = (error: unknown): boolean =>
  !!error &&
  typeof error === 'object' &&
  'code' in error &&
  (error as { code?: string }).code === 'auth/multi-factor-auth-required';

export type AccountDeletionResult =
  | { status: 'completed' }
  | { status: 'blocked'; message: string }
  | { status: 'failed'; message: string };

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  public isAuthenticated = signal<boolean>(false);
  public currentUserId = signal<number | null>(null);
  public currentUserRole = signal<string | null>(null);
  public isInitialized = signal<boolean>(false);
  public isProcessing = signal<boolean>(false);
  /** Firebase user has enrolled MFA factors (account setting). */
  public mfaEnrolled = signal<boolean>(false);
  /** Current ID token includes MFA verification (`amr` contains `mfa`). */
  public mfaVerifiedInSession = signal<boolean>(false);
  /** Browser session id registered in Dragonfly session registry. */
  public sessionId = signal<string | null>(null);
  private http = inject(HttpClient);
  private sessionApi = inject(SessionApiService);
  private sessionWs = inject(SessionWsService);
  public auth: any;

  private useMock =
    typeof window !== 'undefined' && environment.firebase.apiKey === 'PLACEHOLDER_API_KEY'; // pragma: allowlist secret

  private syncCrossSiteAuthCache(): void {
    if (typeof window === 'undefined') return;
    const snapshot = {
      isAuthenticated: this.isAuthenticated(),
      userId: this.currentUserId(),
      role: this.currentUserRole(),
      timestamp: Date.now(),
    };
    if (snapshot.isAuthenticated) {
      localStorage.setItem('deml_auth_status', JSON.stringify(snapshot));
    } else {
      localStorage.removeItem('deml_auth_status');
      localStorage.removeItem('deml_session_active');
    }
  }

  constructor() {
    if (typeof window !== 'undefined') {
      if (this.useMock) {
        const mockUserStr = localStorage.getItem('mock_user');
        if (mockUserStr) {
          const user = JSON.parse(mockUserStr);
          this.auth = {
            currentUser: {
              getIdToken: async () => `mock-token-${user.username}-${user.email}`,
              displayName: user.username,
              email: user.email,
            },
          };
          this.isAuthenticated.set(true);
          this.currentUserId.set(user.id || 1);
          this.currentUserRole.set(user.role || 'Operator');
        } else {
          this.auth = null;
          this.isAuthenticated.set(false);
          this.currentUserId.set(null);
          this.currentUserRole.set(null);
        }
        this.isInitialized.set(true);
        this.isProcessing.set(false);
        this.syncCrossSiteAuthCache();
      } else {
        const app = getApps().length === 0 ? initializeApp(environment.firebase) : getApp();
        this.auth = getAuth(app);

        onAuthStateChanged(this.auth, async (user: FirebaseUser | null) => {
          if (user) {
            try {
              const token = await user.getIdToken();
              const res: any = await firstValueFrom(
                this.http
                  .get(`${environment.backendUrl}/api/v1/auth/user`, {
                    headers: { Authorization: `Bearer ${token}` },
                  })
                  .pipe(timeout(20000)),
              );
              if (res.status === 'success') {
                this.isAuthenticated.set(true);
                this.currentUserId.set(res.user_id);
                this.currentUserRole.set(res.role);
              } else {
                this.isAuthenticated.set(false);
                this.currentUserId.set(null);
                this.currentUserRole.set(null);
              }
              await this.refreshMfaState();
              await this.bindServerSession(user);
            } catch (e: any) {
              console.error('Failed to sync auth with backend', e);
              this.isAuthenticated.set(false);
              this.currentUserId.set(null);
              this.currentUserRole.set(null);
              this.mfaEnrolled.set(false);
              this.mfaVerifiedInSession.set(false);
            }
          } else {
            this.isAuthenticated.set(false);
            this.currentUserId.set(null);
            this.currentUserRole.set(null);
            this.mfaEnrolled.set(false);
            this.mfaVerifiedInSession.set(false);
            this.clearMfaSessionFlag();
            this.sessionWs.disconnect();
            this.sessionId.set(null);
          }
          this.isInitialized.set(true);
          this.isProcessing.set(false);
          this.syncCrossSiteAuthCache();
        });
      }
    } else {
      this.isInitialized.set(true);
      this.isProcessing.set(false);
    }
  }

  async checkAuth() {
    this.isProcessing.set(true);
    if (this.useMock) {
      const mockUserStr = localStorage.getItem('mock_user');
      if (mockUserStr) {
        const user = JSON.parse(mockUserStr);
        try {
          const token = `mock-token-${user.username}-${user.email}`;
          const res: any = await firstValueFrom(
            this.http.get(`${environment.backendUrl}/api/v1/auth/user`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          );
          if (res.status === 'success') {
            this.isAuthenticated.set(true);
            this.currentUserId.set(res.user_id);
            this.currentUserRole.set(res.role);
          }
        } catch (_e: any) {
          this.isAuthenticated.set(true);
          this.currentUserId.set(user.id || 1);
          this.currentUserRole.set(user.role || 'Operator');
        }
      } else {
        this.isAuthenticated.set(false);
        this.currentUserId.set(null);
        this.currentUserRole.set(null);
      }
      this.isProcessing.set(false);
      return;
    }
    if (!this.auth) {
      this.isAuthenticated.set(false);
      this.currentUserId.set(null);
      this.currentUserRole.set(null);
      this.isProcessing.set(false);
      return;
    }
    const user = this.auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();
        const res: any = await firstValueFrom(
          this.http.get(`${environment.backendUrl}/api/v1/auth/user`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        );
        if (res.status === 'success') {
          this.isAuthenticated.set(true);
          this.currentUserId.set(res.user_id);
          this.currentUserRole.set(res.role);
        } else {
          this.isAuthenticated.set(false);
          this.currentUserId.set(null);
          this.currentUserRole.set(null);
        }
      } catch (_e: any) {
        this.isAuthenticated.set(false);
        this.currentUserId.set(null);
        this.currentUserRole.set(null);
      }
    } else {
      this.isAuthenticated.set(false);
      this.currentUserId.set(null);
      this.currentUserRole.set(null);
    }
    this.isProcessing.set(false);
  }

  async login(credentials: any): Promise<{ success: boolean; error?: string; resolver?: any }> {
    this.isProcessing.set(true);
    if (this.useMock) {
      const email = credentials.username || 'user@example.com';
      const username = email.split('@')[0] || 'mockuser';
      const role =
        email === 'admin@dataengineeringformachinelearning.com' ? 'Security Admin' : 'Operator';
      const mockUser = { username, email, role, id: 1 };
      localStorage.setItem('mock_user', JSON.stringify(mockUser));
      this.auth = {
        currentUser: {
          getIdToken: async () => `mock-token-${username}-${email}`,
          displayName: username,
          email: email,
        },
      };
      try {
        const token = `mock-token-${username}-${email}`;
        const res: any = await firstValueFrom(
          this.http.get(`${environment.backendUrl}/api/v1/auth/user`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        );
        if (res.status === 'success') {
          this.isAuthenticated.set(true);
          this.currentUserId.set(res.user_id);
          this.currentUserRole.set(res.role);
        }
      } catch (_e: any) {
        this.isAuthenticated.set(true);
        this.currentUserId.set(1);
        this.currentUserRole.set(role);
      }
      this.isProcessing.set(false);
      return { success: true };
    }
    try {
      if (!this.auth) throw new Error('Firebase Auth not initialized');
      // Treat credentials.username as the login email
      await signInWithEmailAndPassword(this.auth, credentials.username, credentials.password);
      this.isProcessing.set(false);
      return { success: true };
    } catch (e: any) {
      this.isProcessing.set(false);
      if (!isMfaRequiredError(e)) {
        console.warn('[Auth] Email login failed:', e?.code ?? 'unknown');
      }
      if (e?.code === 'auth/multi-factor-auth-required') {
        return {
          success: false,
          error: 'MFA_REQUIRED',
          resolver: getMultiFactorResolver(this.auth, e),
        };
      }
      let errorMsg: string;
      if (e?.code) {
        if (e.code === 'auth/invalid-email' || e.code === 'auth/invalid-credential') {
          errorMsg = 'Invalid email or password.';
        } else if (e.code === 'auth/user-not-found') {
          errorMsg = 'User does not exist.';
        } else if (e.code === 'auth/wrong-password') {
          errorMsg = 'Incorrect password.';
        } else {
          errorMsg = 'An error occurred during sign in. Please try again.';
        }
      } else {
        errorMsg = 'An error occurred during sign in. Please try again.';
      }
      return { success: false, error: errorMsg };
    }
  }

  async register(credentials: any): Promise<{ success: boolean; error?: string }> {
    this.isProcessing.set(true);
    if (this.useMock) {
      return this.login({ username: credentials.email, password: credentials.password });
    }
    try {
      if (!this.auth) throw new Error('Firebase Auth not initialized');
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        credentials.email,
        credentials.password,
      );
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: credentials.username });

        // Make sync call to backend so the User profile is immediately created in Django DB
        const token = await userCredential.user.getIdToken();
        await firstValueFrom(
          this.http.get(`${environment.backendUrl}/api/v1/auth/user`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        );
      }
      this.isProcessing.set(false);
      return { success: true };
    } catch (e: any) {
      this.isProcessing.set(false);
      console.error(e);
      let errorMsg: string;
      if (e?.code) {
        if (e.code === 'auth/email-already-in-use') {
          errorMsg = 'Email already in use.';
        } else if (e.code === 'auth/weak-password') {
          errorMsg = 'Password is too weak. Must be at least 6 characters.';
        } else if (e.code === 'auth/invalid-email') {
          errorMsg = 'Invalid email address format.';
        } else {
          errorMsg = 'An error occurred during registration. Please try again.';
        }
      } else {
        errorMsg = 'An error occurred during registration. Please try again.';
      }
      return { success: false, error: errorMsg };
    }
  }

  async logout() {
    this.isProcessing.set(true);
    await this.clearServerSession();
    this.mfaEnrolled.set(false);
    this.mfaVerifiedInSession.set(false);
    this.clearMfaSessionFlag();
    if (this.useMock) {
      localStorage.removeItem('mock_user');
      this.auth = null;
      this.isAuthenticated.set(false);
      this.currentUserId.set(null);
      this.currentUserRole.set(null);
      this.isProcessing.set(false);
      this.syncCrossSiteAuthCache();
      return;
    }
    try {
      if (this.auth) {
        await signOut(this.auth);
      }
      this.isAuthenticated.set(false);
      this.currentUserId.set(null);
      this.currentUserRole.set(null);
      this.isProcessing.set(false);
      this.syncCrossSiteAuthCache();
    } catch (e: any) {
      console.error(e);
      this.isAuthenticated.set(false);
      this.currentUserId.set(null);
      this.currentUserRole.set(null);
      this.isProcessing.set(false);
      this.syncCrossSiteAuthCache();
    }
  }

  async deleteAccount(): Promise<AccountDeletionResult> {
    this.isProcessing.set(true);
    try {
      const res = await firstValueFrom(
        this.http.delete<{ status: string; completed?: boolean }>(
          `${environment.backendUrl}/api/v1/auth/delete-account`,
          {},
        ),
      );

      // Identity deletion is server-owned and may proceed only after FORJD confirms erasure.
      if (!res.completed) {
        this.isProcessing.set(false);
        return {
          status: 'blocked',
          message:
            'Account deletion is blocked until FORJD confirms durable tenant erasure. Your identities and account data remain intact.',
        };
      }
      this.isAuthenticated.set(false);
      this.currentUserId.set(null);
      this.currentUserRole.set(null);
      this.isProcessing.set(false);
      return { status: 'completed' };
    } catch (error: unknown) {
      this.isProcessing.set(false);
      const detail =
        error instanceof HttpErrorResponse && typeof error.error?.detail === 'string'
          ? error.error.detail
          : '';
      if (error instanceof HttpErrorResponse && error.status === 503 && detail.includes('FORJD')) {
        return { status: 'blocked', message: detail };
      }
      console.error(error);
      return {
        status: 'failed',
        message:
          'Account deletion could not be requested. Your identities and account data remain intact. Please try again.',
      };
    }
  }

  async forgotPassword(email: string) {
    try {
      if (!this.auth) return false;
      await sendPasswordResetEmail(this.auth, email);
      return true;
    } catch (e: any) {
      console.error(e);
      return false;
    }
  }

  async resetPassword(payload: any) {
    try {
      if (!this.auth) return false;
      await confirmPasswordReset(this.auth, payload.token, payload.new_password);
      return true;
    } catch (e: any) {
      console.error(e);
      return false;
    }
  }

  async updateUserEmail(newEmail: string) {
    if (!this.auth.currentUser) throw new Error('No user logged in');
    try {
      await updateEmail(this.auth.currentUser, newEmail);
      return { status: 'success' };
    } catch (e: any) {
      console.error(e);
      let errorMsg = 'Failed to update email.';
      if (e.code === 'auth/requires-recent-login') {
        errorMsg =
          'This operation is sensitive and requires recent authentication. Please log out and log back in before retrying.';
      } else if (e.code === 'auth/email-already-in-use') {
        errorMsg = 'This email is already in use by another account.';
      } else if (e.code === 'auth/invalid-email') {
        errorMsg = 'Invalid email address.';
      }
      return { status: 'error', message: errorMsg };
    }
  }

  async updateUserPassword(newPassword: string) {
    if (!this.auth.currentUser) throw new Error('No user logged in');
    try {
      await updatePassword(this.auth.currentUser, newPassword);
      return { status: 'success' };
    } catch (e: any) {
      console.error(e);
      let errorMsg = 'Failed to update password.';
      if (e.code === 'auth/requires-recent-login') {
        errorMsg =
          'This operation is sensitive and requires recent authentication. Please log out and log back in before retrying.';
      } else if (e.code === 'auth/weak-password') {
        errorMsg = 'Password should be at least 6 characters.';
      }
      return { status: 'error', message: errorMsg };
    }
  }

  private static readonly MFA_SESSION_KEY = 'deml.mfa.session.uid';

  /**
   * Mark the browser tab as MFA-verified after SMS resolveSignIn.
   * Survives soft navigations; cleared on logout.
   */
  markMfaSessionVerified(uid?: string | null): void {
    const userUid = uid || (this.auth?.currentUser as FirebaseUser | null | undefined)?.uid;
    if (!userUid || typeof sessionStorage === 'undefined') {
      this.mfaVerifiedInSession.set(true);
      return;
    }
    try {
      sessionStorage.setItem(AuthService.MFA_SESSION_KEY, userUid);
    } catch {
      /* private mode */
    }
    this.mfaVerifiedInSession.set(true);
  }

  private clearMfaSessionFlag(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    try {
      sessionStorage.removeItem(AuthService.MFA_SESSION_KEY);
    } catch {
      /* private mode */
    }
  }

  private hasMfaSessionFlag(uid: string): boolean {
    if (typeof sessionStorage === 'undefined') {
      return false;
    }
    try {
      return sessionStorage.getItem(AuthService.MFA_SESSION_KEY) === uid;
    } catch {
      return false;
    }
  }

  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
      const part = token.split('.')[1];
      if (!part) {
        return null;
      }
      const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
      const json = atob(padded);
      return JSON.parse(json) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  /**
   * Detect whether the current ID token was issued after second-factor auth.
   * Firebase Identity Platform sets `firebase.sign_in_second_factor` (e.g. "phone")
   * after SMS MFA; some tenants also surface OIDC `amr: ["mfa"]`.
   */
  private isMfaVerifiedFromClaims(claims: Record<string, unknown>): boolean {
    const amr = claims['amr'];
    if (
      Array.isArray(amr) &&
      amr.some(entry => {
        const v = String(entry).toLowerCase();
        return v === 'mfa' || v === 'otp' || v === 'sms' || v.includes('mfa');
      })
    ) {
      return true;
    }
    if (typeof amr === 'string') {
      const lower = amr.toLowerCase();
      if (lower.includes('mfa') || lower.includes('otp')) {
        return true;
      }
    }
    // Top-level second-factor claim (some token shapes)
    const topLevelSecond = claims['sign_in_second_factor'] ?? claims['second_factor'];
    if (typeof topLevelSecond === 'string' && topLevelSecond.trim().length > 0) {
      return true;
    }
    const firebaseClaim = claims['firebase'];
    if (typeof firebaseClaim === 'string') {
      try {
        const parsed = JSON.parse(firebaseClaim) as Record<string, unknown>;
        return this.isMfaVerifiedFromClaims({ firebase: parsed });
      } catch {
        /* ignore */
      }
    }
    if (firebaseClaim && typeof firebaseClaim === 'object') {
      const fb = firebaseClaim as Record<string, unknown>;
      const secondFactor =
        fb['sign_in_second_factor'] ?? fb['second_factor_identifier'] ?? fb['secondFactor'];
      if (typeof secondFactor === 'string' && secondFactor.trim().length > 0) {
        return true;
      }
      // phone MFA often lands as identity list entry after SMS challenge
      const identities = fb['identities'];
      if (identities && typeof identities === 'object') {
        const phoneIds = (identities as { phone?: unknown }).phone;
        if (Array.isArray(phoneIds) && phoneIds.length > 0 && claims['auth_time']) {
          // identities alone are not enough — only trust with amr/second factor above
        }
      }
    }
    // Explicit custom claim some environments mint after MFA.
    if (claims['mfa'] === true || claims['mfa_verified'] === true) {
      return true;
    }
    if (claims['mfa'] === 'true' || claims['mfa_verified'] === 'true') {
      return true;
    }
    return false;
  }

  async refreshMfaState(forceToken = false): Promise<void> {
    const user = this.auth?.currentUser as FirebaseUser | null | undefined;
    if (!user) {
      this.mfaEnrolled.set(false);
      this.mfaVerifiedInSession.set(false);
      this.clearMfaSessionFlag();
      return;
    }
    try {
      if (typeof user.reload === 'function') {
        await user.reload();
      }
      const enrolled = multiFactor(user).enrolledFactors.length > 0;
      this.mfaEnrolled.set(enrolled);

      // Force a fresh token after MFA resolve so second-factor claims land.
      let rawToken = '';
      if (typeof user.getIdToken === 'function') {
        rawToken = await user.getIdToken(forceToken);
      }
      const tokenResult = await user.getIdTokenResult(forceToken);
      const claims = {
        ...((tokenResult.claims ?? {}) as Record<string, unknown>),
      };
      // Merge raw JWT payload — some environments surface second-factor only there.
      if (rawToken) {
        const payload = this.decodeJwtPayload(rawToken);
        if (payload) {
          Object.assign(claims, payload);
        }
      }

      let verified = this.isMfaVerifiedFromClaims(claims);
      // Session flag set after successful SMS resolve (same browser tab / uid).
      if (!verified && enrolled && this.hasMfaSessionFlag(user.uid)) {
        verified = true;
      }
      // When MFA is enrolled, Firebase blocks sign-in until second factor succeeds.
      // If we have enrolled factors and a live auth session that was established
      // with a forced token refresh after login, trust the session flag path above.
      // Do NOT auto-trust enrolled alone (mid-session enrollment still needs re-auth).

      this.mfaVerifiedInSession.set(verified);
      if (verified) {
        this.markMfaSessionVerified(user.uid);
      }
    } catch (e) {
      console.warn('MFA state refresh skipped:', e);
      // Do not clobber enrolled / session-verified state on transient token errors.
      try {
        const u = this.auth?.currentUser as FirebaseUser | null | undefined;
        if (u) {
          this.mfaEnrolled.set(multiFactor(u).enrolledFactors.length > 0);
          if (this.hasMfaSessionFlag(u.uid)) {
            this.mfaVerifiedInSession.set(true);
            return;
          }
        }
      } catch {
        this.mfaEnrolled.set(false);
      }
      // Keep previous verified flag if we already have a session mark.
      if (!this.mfaVerifiedInSession()) {
        this.mfaVerifiedInSession.set(false);
      }
    }
  }

  async sendMfaEnrollmentCode(phoneNumber: string, recaptchaVerifier: any): Promise<string> {
    if (!this.auth?.currentUser) throw new Error('No user is currently logged in.');
    const session = await multiFactor(this.auth.currentUser).getSession();
    const phoneInfoOptions = { phoneNumber, session };
    const phoneAuthProvider = new PhoneAuthProvider(this.auth);
    return await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, recaptchaVerifier);
  }

  async confirmMfaEnrollment(verificationId: string, verificationCode: string): Promise<void> {
    if (!this.auth?.currentUser) throw new Error('No user is currently logged in.');
    const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
    const assertion = PhoneMultiFactorGenerator.assertion(cred);
    await multiFactor(this.auth.currentUser).enroll(assertion, 'SMS Phone MFA');
    await this.refreshMfaState(true);
  }

  async unenrollMfa(factorInfo: any): Promise<void> {
    if (!this.auth?.currentUser) throw new Error('No user is currently logged in.');
    await multiFactor(this.auth.currentUser).unenroll(factorInfo);
  }

  private async signInWithPopupCentered(provider: any): Promise<any> {
    const originalOpen = window.open;
    window.open = function (url?: string | URL, target?: string, features?: string) {
      if (features) {
        const w = 500;
        const h = 600;
        const screenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
        const screenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;
        const innerWidth =
          window.innerWidth || document.documentElement.clientWidth || window.screen.width;
        const innerHeight =
          window.innerHeight || document.documentElement.clientHeight || window.screen.height;

        const left = screenLeft + (innerWidth - w) / 2;
        const top = screenTop + (innerHeight - h) / 2;

        features = features.replace(/left=\d+/, `left=${left}`).replace(/top=\d+/, `top=${top}`);
        if (!features.includes('left=')) {
          features += `,left=${left}`;
        }
        if (!features.includes('top=')) {
          features += `,top=${top}`;
        }
      }
      return originalOpen.call(window, url, target, features);
    };

    try {
      return await signInWithPopup(this.auth, provider);
    } finally {
      window.open = originalOpen;
    }
  }

  async loginWithApple(): Promise<{ success: boolean; error?: string; resolver?: any }> {
    this.isProcessing.set(true);
    if (this.useMock) {
      return this.login({ username: 'apple-user@example.com', password: 'password' }); // pragma: allowlist secret
    }
    try {
      if (!this.auth) throw new Error('Firebase Auth not initialized');
      const provider = new OAuthProvider('apple.com');
      const userCredential = await this.signInWithPopupCentered(provider);

      if (userCredential.user) {
        const token = await userCredential.user.getIdToken();
        const res: any = await firstValueFrom(
          this.http.get(`${environment.backendUrl}/api/v1/auth/user`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        );
        if (res.status === 'success') {
          this.currentUserRole.set(res.role);
        }
      }

      this.isProcessing.set(false);
      return { success: true };
    } catch (e: any) {
      this.isProcessing.set(false);
      if (!isMfaRequiredError(e)) {
        console.warn('[Auth] Apple sign-in failed:', e?.code ?? 'unknown');
      }
      if (e?.code === 'auth/multi-factor-auth-required') {
        return {
          success: false,
          error: 'MFA_REQUIRED',
          resolver: getMultiFactorResolver(this.auth, e),
        };
      }
      return { success: false, error: 'Apple Sign-In failed. Please try again.' };
    }
  }

  async loginWithGoogle(): Promise<{ success: boolean; error?: string; resolver?: any }> {
    this.isProcessing.set(true);
    if (this.useMock) {
      return this.login({ username: 'google-user@example.com', password: 'password' }); // pragma: allowlist secret
    }
    try {
      if (!this.auth) throw new Error('Firebase Auth not initialized');
      const provider = new GoogleAuthProvider();
      const userCredential = await this.signInWithPopupCentered(provider);

      if (userCredential.user) {
        const token = await userCredential.user.getIdToken();
        const res: any = await firstValueFrom(
          this.http.get(`${environment.backendUrl}/api/v1/auth/user`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        );
        if (res.status === 'success') {
          this.currentUserRole.set(res.role);
        }
      }

      this.isProcessing.set(false);
      return { success: true };
    } catch (e: any) {
      this.isProcessing.set(false);
      if (!isMfaRequiredError(e)) {
        console.warn('[Auth] Google sign-in failed:', e?.code ?? 'unknown');
      }
      if (e?.code === 'auth/multi-factor-auth-required') {
        return {
          success: false,
          error: 'MFA_REQUIRED',
          resolver: getMultiFactorResolver(this.auth, e),
        };
      }
      return { success: false, error: 'Google Sign-In failed. Please try again.' };
    }
  }

  async linkGoogleAccount(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.auth?.currentUser) throw new Error('No user is currently logged in.');
      const provider = new GoogleAuthProvider();
      await linkWithPopup(this.auth.currentUser, provider);
      return { success: true };
    } catch (e: any) {
      console.error(e);
      if (e?.code === 'auth/credential-already-in-use') {
        return {
          success: false,
          error:
            'This Google account is already associated with another user profile. To connect it, log in to that account first, unlink it, or delete it, and try again.',
        };
      }
      return { success: false, error: 'Google account linking failed. Please try again.' };
    }
  }

  async linkAppleAccount(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.auth?.currentUser) throw new Error('No user is currently logged in.');
      const provider = new OAuthProvider('apple.com');
      await linkWithPopup(this.auth.currentUser, provider);
      return { success: true };
    } catch (e: any) {
      console.error(e);
      if (e?.code === 'auth/credential-already-in-use') {
        return {
          success: false,
          error:
            'This Apple ID is already associated with another user profile. To connect it, log in to that account first, unlink it, or delete it, and try again.',
        };
      }
      return { success: false, error: 'Apple account linking failed. Please try again.' };
    }
  }

  async unlinkProvider(providerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.auth?.currentUser) throw new Error('No user is currently logged in.');
      await unlink(this.auth.currentUser, providerId);
      return { success: true };
    } catch (e: any) {
      console.error(e);
      return { success: false, error: `Failed to unlink ${providerId}. Please try again.` };
    }
  }

  async navigateToMarketingSite(marketingUrl: string = environment.marketingUrl) {
    const targetUrl = marketingUrl ?? '';
    if (!this.isAuthenticated() || !this.auth?.currentUser) {
      window.location.href = targetUrl;
      return;
    }
    this.isProcessing.set(true);
    try {
      const fbToken = await this.auth.currentUser.getIdToken();
      const res: any = await firstValueFrom(
        this.http.post(
          `${environment.backendUrl}/api/v1/auth/handoff/generate`,
          {},
          {
            headers: { Authorization: `Bearer ${fbToken}` },
          },
        ),
      );
      if (res.status === 'success' && res.token) {
        const handoffUrl = new URL(targetUrl, window.location.origin);
        handoffUrl.searchParams.set('session_handoff', res.token);
        window.location.href = handoffUrl.href;
      } else {
        window.location.href = targetUrl;
      }
    } catch (e: any) {
      console.error('Failed to generate handoff token', e);
      window.location.href = targetUrl;
    } finally {
      this.isProcessing.set(false);
    }
  }

  /** Register browser session in Dragonfly and open revoke WebSocket. */
  private async bindServerSession(user: FirebaseUser): Promise<void> {
    if (typeof window === 'undefined' || this.useMock) {
      return;
    }
    let id = sessionStorage.getItem('deml_session_id');
    const isNew = !id;
    if (isNew) {
      id = crypto.randomUUID();
    }
    this.sessionId.set(id);
    try {
      const token = await user.getIdToken();
      await this.sessionApi.register(id!, token);
      if (isNew) {
        sessionStorage.setItem('deml_session_id', id!);
      }
      this.sessionWs.connect(token, id!);
    } catch (error) {
      console.warn('Session registry unavailable', error);
      // Clear bad/stale id so it doesn't cause 401s on subsequent calls
      this.sessionId.set(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('deml_session_id');
      }
    }
  }

  /** Deregister current session server-side (best effort). */
  private async clearServerSession(revokeAll = false): Promise<void> {
    this.sessionWs.disconnect();
    const id = this.sessionId();
    if (this.auth?.currentUser && id && !this.useMock) {
      try {
        const token = await this.auth.currentUser.getIdToken();
        await this.sessionApi.logout(id, token, revokeAll);
      } catch {
        /* best effort */
      }
    }
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('deml_session_id');
    }
    this.sessionId.set(null);
  }
}
