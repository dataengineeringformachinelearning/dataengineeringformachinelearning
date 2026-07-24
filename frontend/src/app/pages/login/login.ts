import {
  Component,
  inject,
  ChangeDetectionStrategy,
  signal,
  effect,
  OnInit,
  OnDestroy,
  PLATFORM_ID,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import {
  VikingAuthPanel,
  VikingButton,
  VikingCallout,
  VikingField,
  VikingInput,
  VikingVerificationCodeField,
} from '@dataengineeringformachinelearning/viking-ui';

import { AuthService } from '../../services/auth.service';
import {
  logFirebaseAuthError,
  mapFirebaseMfaError,
  mapFirebasePhoneError,
  normalizePhoneE164,
  phoneValidationError,
} from '../../core/utils/phone.utils';
import { resolvePostLoginTarget } from '../../core/utils/return-url.utils';
import {
  ConfirmationResult,
  MultiFactorResolver,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
} from 'firebase/auth';

type CheckoutResponse = { checkout_url?: string };
type DesktopHandoffResponse = { status: string; token?: string };
type AuthAttemptResult = { error?: string; resolver?: unknown };

const isMultiFactorResolver = (value: unknown): value is MultiFactorResolver =>
  value !== null &&
  typeof value === 'object' &&
  'hints' in value &&
  Array.isArray(value.hints) &&
  'session' in value &&
  'resolveSignIn' in value &&
  typeof value.resolveSignIn === 'function';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    VikingAuthPanel,
    VikingButton,
    VikingCallout,
    VikingField,
    VikingInput,
    VikingVerificationCodeField,
  ],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private http = inject(HttpClient);
  private desktopHandoffStarted = false;

  constructor() {
    effect(() => {
      if (this.authService.isInitialized() && this.authService.isAuthenticated()) {
        const action = this.route.snapshot.queryParams['action'];
        if (action === 'checkout') {
          this.isLoading.set(true);
          this.http
            .post<CheckoutResponse>(
              `${environment.backendUrl}/api/v1/billing/create-checkout-session`,
              {},
            )
            .subscribe({
              next: res => {
                if (res.checkout_url) {
                  window.location.href = res.checkout_url;
                } else {
                  this.router.navigate(['/account']);
                }
              },
              error: () => {
                this.router.navigate(['/account']);
              },
            });
        } else {
          this.handleSuccess();
        }
      }
    });
  }

  isRegisterMode = signal<boolean>(false);
  isForgotMode = signal<boolean>(false);
  isResetMode = signal<boolean>(false);
  isPhoneMode = signal<boolean>(false);
  codeSent = signal<boolean>(false);
  mfaRequired = signal<boolean>(false);
  isLoading = signal<boolean>(false);

  successMessage = signal<string | null>(null);
  error = signal<string | null>(null);
  sessionExpired = signal<boolean>(false);
  isDesktopAuth = signal<boolean>(false);

  readonly loginForm = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
    email: [''],
    phone: [''],
    verificationCode: [''],
  });

  recaptchaVerifier: RecaptchaVerifier | null = null;
  confirmationResult: ConfirmationResult | null = null;
  resolver: MultiFactorResolver | null = null;
  verificationId = signal<string | null>(null);
  token = signal<string>('');

  protected pageTitle = (): string => {
    if (this.isForgotMode()) return 'Reset Password';
    if (this.isResetMode()) return 'Set New Password';
    if (this.mfaRequired()) return 'Two-Factor verification';
    if (this.isPhoneMode()) return 'Sign In with Phone';
    if (this.isRegisterMode()) return 'Sign Up';
    return 'Sign In';
  };

  protected showSocialLogin = (): boolean =>
    !this.successMessage() &&
    !this.isForgotMode() &&
    !this.isResetMode() &&
    !this.mfaRequired() &&
    !this.codeSent();

  protected submitLabel = (): string => {
    if (this.isForgotMode()) return 'Send Link';
    if (this.isResetMode()) return 'Reset';
    if (this.mfaRequired()) return 'Verify';
    if (this.isPhoneMode() && !this.codeSent()) return 'Send OTP';
    if (this.isPhoneMode() && this.codeSent()) return 'Login';
    if (this.isRegisterMode()) return 'Sign Up';
    return 'Login';
  };

  protected submitIcon = (): 'send' | 'lock' | 'shield' | 'user' | null => {
    if (this.isForgotMode()) return 'send';
    if (this.isResetMode()) return 'lock';
    if (this.mfaRequired()) return 'shield';
    if (this.isPhoneMode() && !this.codeSent()) return 'send';
    if (this.isRegisterMode()) return 'user';
    return null;
  };

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['reason'] === 'timeout') {
        this.sessionExpired.set(true);
      }
      const mode = params['mode'];
      this.isDesktopAuth.set(Boolean(params['desktop_callback']));
      if (mode === 'reset') {
        this.isResetMode.set(true);
        this.token.set(params['token'] || '');
        this.loginForm.get('username')?.clearValidators();
        this.loginForm.get('username')?.updateValueAndValidity();
        this.loginForm.get('password')?.setValidators([Validators.required]);
        this.loginForm.get('password')?.updateValueAndValidity();
      } else if (mode === 'register') {
        this.isRegisterMode.set(true);
      }
    });
  }

  ngOnDestroy() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.clearRecaptcha();
  }

  toggleMode(): void {
    if (this.isForgotMode() || this.isPhoneMode()) {
      this.isForgotMode.set(false);
      this.isPhoneMode.set(false);
      this.isRegisterMode.set(false);
    } else {
      this.isRegisterMode.update(val => !val);
    }
    this.error.set(null);
    this.successMessage.set(null);
    this.codeSent.set(false);
    this.mfaRequired.set(false);

    this.loginForm.get('phone')?.clearValidators();
    this.loginForm.get('phone')?.updateValueAndValidity();
    this.loginForm.get('verificationCode')?.clearValidators();
    this.loginForm.get('verificationCode')?.updateValueAndValidity();

    this.loginForm.get('username')?.setValidators([Validators.required]);
    this.loginForm.get('username')?.updateValueAndValidity();
    this.loginForm.get('password')?.setValidators([Validators.required]);
    this.loginForm.get('password')?.updateValueAndValidity();

    if (this.isRegisterMode()) {
      this.loginForm.get('email')?.setValidators([Validators.required, Validators.email]);
    } else {
      this.loginForm.get('email')?.clearValidators();
    }
    this.loginForm.get('email')?.updateValueAndValidity();
  }

  switchToForgot(): void {
    this.isForgotMode.set(true);
    this.isRegisterMode.set(false);
    this.isPhoneMode.set(false);
    this.error.set(null);
    this.successMessage.set(null);
    this.codeSent.set(false);
    this.mfaRequired.set(false);

    this.loginForm.get('username')?.clearValidators();
    this.loginForm.get('username')?.updateValueAndValidity();
    this.loginForm.get('password')?.clearValidators();
    this.loginForm.get('password')?.updateValueAndValidity();
    this.loginForm.get('phone')?.clearValidators();
    this.loginForm.get('phone')?.updateValueAndValidity();
    this.loginForm.get('verificationCode')?.clearValidators();
    this.loginForm.get('verificationCode')?.updateValueAndValidity();

    this.loginForm.get('email')?.setValidators([Validators.required, Validators.email]);
    this.loginForm.get('email')?.updateValueAndValidity();
  }

  switchToPhone(): void {
    this.isPhoneMode.set(true);
    this.isRegisterMode.set(false);
    this.isForgotMode.set(false);
    this.error.set(null);
    this.successMessage.set(null);
    this.codeSent.set(false);
    this.mfaRequired.set(false);

    this.loginForm.get('username')?.clearValidators();
    this.loginForm.get('username')?.updateValueAndValidity();
    this.loginForm.get('password')?.clearValidators();
    this.loginForm.get('password')?.updateValueAndValidity();
    this.loginForm.get('email')?.clearValidators();
    this.loginForm.get('email')?.updateValueAndValidity();
    this.loginForm.get('verificationCode')?.clearValidators();
    this.loginForm.get('verificationCode')?.updateValueAndValidity();

    this.loginForm.get('phone')?.setValidators([Validators.required]);
    this.loginForm.get('phone')?.updateValueAndValidity();
  }

  switchToLogin(): void {
    this.isForgotMode.set(false);
    this.isRegisterMode.set(false);
    this.isResetMode.set(false);
    this.isPhoneMode.set(false);
    this.error.set(null);
    this.successMessage.set(null);
    this.codeSent.set(false);
    this.mfaRequired.set(false);

    this.loginForm.get('email')?.clearValidators();
    this.loginForm.get('email')?.updateValueAndValidity();
    this.loginForm.get('phone')?.clearValidators();
    this.loginForm.get('phone')?.updateValueAndValidity();
    this.loginForm.get('verificationCode')?.clearValidators();
    this.loginForm.get('verificationCode')?.updateValueAndValidity();

    this.loginForm.get('username')?.setValidators([Validators.required]);
    this.loginForm.get('username')?.updateValueAndValidity();
    this.loginForm.get('password')?.setValidators([Validators.required]);
    this.loginForm.get('password')?.updateValueAndValidity();
  }

  private readonly setMfaVerificationValidators = (): void => {
    for (const controlName of ['username', 'password', 'email', 'phone'] as const) {
      const control = this.loginForm.get(controlName);
      control?.clearValidators();
      control?.updateValueAndValidity();
    }

    const verificationCode = this.loginForm.get('verificationCode');
    verificationCode?.setValidators([Validators.required]);
    verificationCode?.updateValueAndValidity();
  };

  /** Tear down verifier so the next SMS send gets a fresh challenge. */
  private clearRecaptcha(): void {
    if (this.recaptchaVerifier) {
      try {
        this.recaptchaVerifier.clear();
      } catch (e) {
        console.error('Error clearing recaptcha verifier', e);
      }
      this.recaptchaVerifier = null;
    }
    document.getElementById('recaptcha-container')?.remove();
  }

  /**
   * Build an invisible RecaptchaVerifier for phone / MFA SMS.
   * Always re-render after use or failure — Firebase invalidates the token once.
   */
  private async ensureRecaptcha(): Promise<InstanceType<typeof RecaptchaVerifier>> {
    const auth = this.authService.auth;
    if (!auth) {
      throw new Error('Firebase Auth is not initialized');
    }
    if (this.recaptchaVerifier) {
      return this.recaptchaVerifier;
    }
    let element = document.getElementById('recaptcha-container');
    if (!element) {
      element = document.createElement('div');
      element.id = 'recaptcha-container';
      // Keep off-screen but in the layout tree (some browsers ignore size:0 nodes).
      element.setAttribute(
        'style',
        'position:fixed;left:-9999px;width:1px;height:1px;overflow:hidden;',
      );
      document.body.appendChild(element);
    }
    this.recaptchaVerifier = new RecaptchaVerifier(auth, element, {
      size: 'invisible',
      callback: () => undefined,
      'expired-callback': () => {
        this.clearRecaptcha();
      },
      'error-callback': () => {
        this.clearRecaptcha();
      },
    });
    // Force widget render so Enterprise → v2 fallback completes before verifyPhoneNumber.
    await this.recaptchaVerifier.render();
    return this.recaptchaVerifier;
  }

  handleSuccess(): void {
    const action = this.route.snapshot.queryParams['action'];
    if (action === 'checkout') {
      return; // The effect will catch this and handle the redirect
    }
    if (this.route.snapshot.queryParams['desktop_callback']) {
      if (!this.desktopHandoffStarted) {
        this.desktopHandoffStarted = true;
        void this.completeDesktopAuthentication();
      }
      return;
    }
    const marketingOrigin = (() => {
      try {
        return new URL(environment.marketingUrl).origin;
      } catch {
        return '';
      }
    })();
    const appOrigin = isPlatformBrowser(this.platformId) ? window.location.origin : '';
    const target = resolvePostLoginTarget(this.route.snapshot.queryParams['returnUrl'], {
      marketingOrigin,
      appOrigin,
    });
    if (target.kind === 'external') {
      void this.authService.navigateToMarketingSite(target.url);
      return;
    }
    void this.router.navigateByUrl(target.url);
  }

  private desktopRequest(): {
    callback: URL;
    state: string;
    codeChallenge: string;
  } | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const params = this.route.snapshot.queryParams;
    try {
      const callback = new URL(String(params['desktop_callback'] || ''));
      const state = String(params['desktop_state'] || '');
      const codeChallenge = String(params['code_challenge'] || '');
      const safeValue = /^[A-Za-z0-9_-]{43,128}$/;
      if (
        callback.protocol !== 'http:' ||
        callback.hostname !== '127.0.0.1' ||
        callback.pathname !== '/callback' ||
        !safeValue.test(state) ||
        !safeValue.test(codeChallenge)
      ) {
        return null;
      }
      return { callback, state, codeChallenge };
    } catch {
      return null;
    }
  }

  private async completeDesktopAuthentication(): Promise<void> {
    const request = this.desktopRequest();
    if (!request || !this.authService.auth?.currentUser) {
      this.error.set(
        'The desktop sign-in request is invalid or has expired. Return to the app and try again.',
      );
      this.desktopHandoffStarted = false;
      return;
    }
    this.isLoading.set(true);
    this.successMessage.set('Authentication complete. Returning to DEML Security Workbench…');
    try {
      const firebaseToken = await this.authService.auth.currentUser.getIdToken();
      const response = await firstValueFrom(
        this.http.post<DesktopHandoffResponse>(
          `${environment.backendUrl}/api/v1/auth/handoff/generate`,
          {
            code_challenge: request.codeChallenge,
            client_name: 'DEML Security Workbench',
          },
          { headers: { Authorization: `Bearer ${firebaseToken}` } },
        ),
      );
      if (response.status !== 'success' || !response.token) {
        throw new Error('The server did not issue a desktop authorization code.');
      }
      request.callback.searchParams.set('code', response.token);
      request.callback.searchParams.set('state', request.state);
      window.location.assign(request.callback.toString());
    } catch (error) {
      console.error('Desktop authentication handoff failed', error);
      this.successMessage.set(null);
      this.error.set('Could not return authentication to the desktop app. Please try again.');
      this.desktopHandoffStarted = false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async sendVerificationCode() {
    this.error.set(null);
    const phoneNum = this.loginForm.controls.phone.value;
    const validationError = phoneValidationError(phoneNum ?? '');
    if (validationError) {
      this.error.set(validationError);
      return;
    }
    const normalizedPhone = normalizePhoneE164(phoneNum);
    this.loginForm.patchValue({ phone: normalizedPhone });
    this.isLoading.set(true);
    try {
      const auth = this.authService.auth;
      if (!auth) {
        throw new Error('Firebase Auth is not initialized');
      }
      // Fresh verifier every send — used tokens cannot be reused.
      this.clearRecaptcha();
      const verifier = await this.ensureRecaptcha();
      this.confirmationResult = await signInWithPhoneNumber(auth, normalizedPhone, verifier);
      this.codeSent.set(true);
      this.loginForm.get('verificationCode')?.setValidators([Validators.required]);
      this.loginForm.get('verificationCode')?.updateValueAndValidity();
    } catch (e: unknown) {
      logFirebaseAuthError('Phone OTP send', e);
      this.clearRecaptcha();
      const code =
        e && typeof e === 'object' && 'code' in e
          ? String((e as { code?: string }).code)
          : undefined;
      this.error.set(mapFirebasePhoneError(code));
    } finally {
      this.isLoading.set(false);
    }
  }

  async verifyCode() {
    this.error.set(null);
    const code = this.loginForm.controls.verificationCode.value;
    const confirmationResult = this.confirmationResult;
    if (!code || !confirmationResult) {
      this.error.set('Verification code is required.');
      return;
    }
    this.isLoading.set(true);
    try {
      await confirmationResult.confirm(code);
      this.handleSuccess();
    } catch (e: unknown) {
      logFirebaseAuthError('Phone OTP verify', e);
      const codeErr =
        e && typeof e === 'object' && 'code' in e
          ? String((e as { code?: string }).code)
          : undefined;
      this.error.set(mapFirebaseMfaError(codeErr));
    } finally {
      this.isLoading.set(false);
    }
  }

  async sendMfaVerificationCode(resolver: MultiFactorResolver) {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const auth = this.authService.auth;
      if (!auth) {
        throw new Error('Firebase Auth is not initialized');
      }
      this.clearRecaptcha();
      const verifier = await this.ensureRecaptcha();
      const multiFactorHint = resolver.hints[0];
      if (!multiFactorHint) {
        throw new Error('No enrolled MFA factor is available.');
      }
      const phoneInfoOptions = {
        multiFactorHint,
        session: resolver.session,
      };
      const phoneAuthProvider = new PhoneAuthProvider(auth);
      const verifyId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, verifier);
      this.verificationId.set(verifyId);
      this.resolver = resolver;
      this.setMfaVerificationValidators();
      this.mfaRequired.set(true);
      this.codeSent.set(true);
    } catch (e: unknown) {
      logFirebaseAuthError('MFA SMS send', e);
      this.clearRecaptcha();
      const code =
        e && typeof e === 'object' && 'code' in e
          ? String((e as { code?: string }).code)
          : undefined;
      this.error.set(mapFirebasePhoneError(code));
    } finally {
      this.isLoading.set(false);
    }
  }

  async resolveMfa() {
    this.error.set(null);
    const code = this.loginForm.controls.verificationCode.value;
    const verifyId = this.verificationId();
    const resolver = this.resolver;
    if (!code || !verifyId || !resolver) {
      this.error.set('Verification code is required.');
      return;
    }
    this.isLoading.set(true);
    try {
      const cred = PhoneAuthProvider.credential(verifyId, code);
      const assertion = PhoneMultiFactorGenerator.assertion(cred);
      await resolver.resolveSignIn(assertion);
      // Force a new ID token so firebase.sign_in_second_factor / amr claims land.
      const user = this.authService.auth?.currentUser;
      if (user && typeof user.getIdToken === 'function') {
        await user.getIdToken(true);
      }
      // Persist MFA session immediately so settings forms unlock even if claim
      // shapes differ across Identity Platform tenants.
      this.authService.markMfaSessionVerified(user?.uid);
      await this.authService.refreshMfaState(true);
      this.successMessage.set('Two-factor verification complete. Redirecting…');
      setTimeout(() => this.handleSuccess(), 600);
    } catch (e: unknown) {
      logFirebaseAuthError('MFA verify', e);
      const codeErr =
        e && typeof e === 'object' && 'code' in e
          ? String((e as { code?: string }).code)
          : undefined;
      this.error.set(mapFirebaseMfaError(codeErr));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async handleMfaChallenge(result: AuthAttemptResult): Promise<boolean> {
    if (result.error !== 'MFA_REQUIRED') {
      return false;
    }
    if (!isMultiFactorResolver(result.resolver)) {
      this.error.set('Multi-factor authentication could not be initialized. Please try again.');
      return true;
    }
    await this.sendMfaVerificationCode(result.resolver);
    return true;
  }

  async onSubmit() {
    if (this.loginForm.invalid) return;

    const formValue = this.loginForm.getRawValue();
    this.error.set(null);
    this.successMessage.set(null);

    // Only set loading if it's not a normal login or MFA verification
    const isNormalLogin =
      !this.isForgotMode() && !this.isResetMode() && !this.isPhoneMode() && !this.mfaRequired();
    if (!isNormalLogin) {
      this.isLoading.set(true);
    }

    try {
      if (this.isForgotMode()) {
        const email = formValue.email;
        const success = await this.authService.forgotPassword(email);
        if (success) {
          this.successMessage.set(
            'If that email exists in our records, we have sent a password reset link.',
          );
        } else {
          this.error.set('Failed to submit request. Please try again.');
        }
      } else if (this.isResetMode()) {
        const newPassword = formValue.password;
        const success = await this.authService.resetPassword({
          token: this.token(),
          new_password: newPassword,
        });
        if (success) {
          this.successMessage.set('Password successfully reset! You can now log in.');
          setTimeout(() => {
            this.switchToLogin();
          }, 3000);
        } else {
          this.error.set('Failed to reset password. The link may have expired or is invalid.');
        }
      } else if (this.isPhoneMode()) {
        if (this.codeSent()) {
          await this.verifyCode();
        } else {
          await this.sendVerificationCode();
        }
      } else if (this.mfaRequired()) {
        await this.resolveMfa();
      } else {
        const result = this.isRegisterMode()
          ? await this.authService.register({
              username: formValue.username,
              password: formValue.password,
              email: formValue.email,
            })
          : await this.authService.login({
              username: formValue.username,
              password: formValue.password,
            });

        if (result.success) {
          this.handleSuccess();
        } else if (await this.handleMfaChallenge(result)) {
          // MFA challenge initialized by the helper.
        } else {
          this.error.set(result.error || 'Authentication failed.');
        }
      }
    } catch (e: unknown) {
      logFirebaseAuthError('Login submit', e);
      this.error.set(
        'An error occurred during submission. Please check your credentials and try again.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async signInWithApple() {
    this.error.set(null);
    this.successMessage.set(null);
    this.isLoading.set(true);
    try {
      const result = await this.authService.loginWithApple();
      if (result.success) {
        this.handleSuccess();
      } else if (await this.handleMfaChallenge(result)) {
        // MFA challenge initialized by the helper.
      } else {
        this.error.set(result.error || 'Apple Sign-In failed.');
      }
    } catch (e: unknown) {
      logFirebaseAuthError('Apple sign-in', e);
      this.error.set('An error occurred during Apple Sign-In. Please try again later.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async signInWithGoogle() {
    this.error.set(null);
    this.successMessage.set(null);
    this.isLoading.set(true);
    try {
      const result = await this.authService.loginWithGoogle();
      if (result.success) {
        this.handleSuccess();
      } else if (await this.handleMfaChallenge(result)) {
        // MFA challenge initialized by the helper.
      } else {
        this.error.set(result.error || 'Google Sign-In failed.');
      }
    } catch (e: unknown) {
      logFirebaseAuthError('Google sign-in', e);
      this.error.set('An error occurred during Google Sign-In. Please try again later.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
