import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { initializeApp } from 'firebase/app';
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
  deleteUser,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  getMultiFactorResolver,
  MultiFactorResolver,
  MultiFactorAssertion,
  multiFactor,
  OAuthProvider,
  signInWithPopup,
  GoogleAuthProvider,
  linkWithPopup,
  unlink,
} from 'firebase/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  public isAuthenticated = signal<boolean>(false);
  public currentUserId = signal<number | null>(null);
  public isInitialized = signal<boolean>(false);
  public isProcessing = signal<boolean>(true);
  private http = inject(HttpClient);
  public auth: any;

  constructor() {
    if (typeof window !== 'undefined') {
      const app = initializeApp(environment.firebase);
      this.auth = getAuth(app);

      onAuthStateChanged(this.auth, async (user: FirebaseUser | null) => {
        this.isProcessing.set(true);
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
            } else {
              this.isAuthenticated.set(false);
              this.currentUserId.set(null);
            }
          } catch (e) {
            console.error('Failed to sync auth with backend', e);
            this.isAuthenticated.set(false);
            this.currentUserId.set(null);
          }
        } else {
          this.isAuthenticated.set(false);
          this.currentUserId.set(null);
        }
        this.isInitialized.set(true);
        this.isProcessing.set(false);
      });
    } else {
      this.isInitialized.set(true);
      this.isProcessing.set(false);
    }
  }

  async checkAuth() {
    this.isProcessing.set(true);
    if (!this.auth) {
      this.isAuthenticated.set(false);
      this.currentUserId.set(null);
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
        } else {
          this.isAuthenticated.set(false);
          this.currentUserId.set(null);
        }
      } catch (e) {
        this.isAuthenticated.set(false);
        this.currentUserId.set(null);
      }
    } else {
      this.isAuthenticated.set(false);
      this.currentUserId.set(null);
    }
    this.isProcessing.set(false);
  }

  async login(credentials: any): Promise<{ success: boolean; error?: string; resolver?: any }> {
    this.isProcessing.set(true);
    try {
      if (!this.auth) throw new Error('Firebase Auth not initialized');
      // Treat credentials.username as the login email
      await signInWithEmailAndPassword(this.auth, credentials.username, credentials.password);
      this.isProcessing.set(false);
      return { success: true };
    } catch (e: any) {
      this.isProcessing.set(false);
      console.error(e);
      if (e?.code === 'auth/multi-factor-auth-required') {
        return {
          success: false,
          error: 'MFA_REQUIRED',
          resolver: getMultiFactorResolver(this.auth, e),
        };
      }
      let errorMsg = 'Invalid credentials or user does not exist.';
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
      let errorMsg = 'Registration failed.';
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
    try {
      if (this.auth) {
        await signOut(this.auth);
      }
      this.isAuthenticated.set(false);
      this.currentUserId.set(null);
      this.isProcessing.set(false);
    } catch (e) {
      console.error(e);
      this.isAuthenticated.set(false);
      this.currentUserId.set(null);
      this.isProcessing.set(false);
    }
  }

  async deleteAccount() {
    this.isProcessing.set(true);
    try {
      // First delete on backend (so request is authenticated with active token)
      await firstValueFrom(
        this.http.delete(`${environment.backendUrl}/api/v1/auth/delete-account`, {}),
      );

      // Then delete from Firebase
      if (this.auth?.currentUser) {
        await deleteUser(this.auth.currentUser);
      }
      this.isAuthenticated.set(false);
      this.currentUserId.set(null);
      this.isProcessing.set(false);
      return true;
    } catch (e) {
      console.error(e);
      this.isProcessing.set(false);
      return false;
    }
  }

  async forgotPassword(email: string) {
    try {
      if (!this.auth) return false;
      await sendPasswordResetEmail(this.auth, email);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async resetPassword(payload: any) {
    try {
      if (!this.auth) return false;
      await confirmPasswordReset(this.auth, payload.token, payload.new_password);
      return true;
    } catch (e) {
      console.error(e);
      return false;
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
  }

  async unenrollMfa(factorInfo: any): Promise<void> {
    if (!this.auth?.currentUser) throw new Error('No user is currently logged in.');
    await multiFactor(this.auth.currentUser).unenroll(factorInfo);
  }

  async loginWithApple(): Promise<{ success: boolean; error?: string; resolver?: any }> {
    this.isProcessing.set(true);
    try {
      if (!this.auth) throw new Error('Firebase Auth not initialized');
      const provider = new OAuthProvider('apple.com');
      const userCredential = await signInWithPopup(this.auth, provider);

      if (userCredential.user) {
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
      if (e?.code === 'auth/multi-factor-auth-required') {
        return {
          success: false,
          error: 'MFA_REQUIRED',
          resolver: getMultiFactorResolver(this.auth, e),
        };
      }
      return { success: false, error: e.message || 'Apple Sign-In failed.' };
    }
  }

  async loginWithGoogle(): Promise<{ success: boolean; error?: string; resolver?: any }> {
    this.isProcessing.set(true);
    try {
      if (!this.auth) throw new Error('Firebase Auth not initialized');
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(this.auth, provider);

      if (userCredential.user) {
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
      if (e?.code === 'auth/multi-factor-auth-required') {
        return {
          success: false,
          error: 'MFA_REQUIRED',
          resolver: getMultiFactorResolver(this.auth, e),
        };
      }
      return { success: false, error: e.message || 'Google Sign-In failed.' };
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
      return { success: false, error: e.message || 'Google account linking failed.' };
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
      return { success: false, error: e.message || 'Apple account linking failed.' };
    }
  }

  async unlinkProvider(providerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.auth?.currentUser) throw new Error('No user is currently logged in.');
      await unlink(this.auth.currentUser, providerId);
      return { success: true };
    } catch (e: any) {
      console.error(e);
      return { success: false, error: e.message || `Failed to unlink ${providerId}.` };
    }
  }
}
