import {
  Component,
  inject,
  ChangeDetectionStrategy,
  signal,
  effect,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../services/auth.service';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
} from 'firebase/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './login.scss',
})
export class Login implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  constructor() {
    effect(() => {
      if (this.authService.isInitialized() && this.authService.isAuthenticated()) {
        const action = this.route.snapshot.queryParams['action'];
        if (action === 'checkout') {
          this.isLoading.set(true);
          this.http
            .post<any>(`${environment.backendUrl}/api/v1/billing/create-checkout-session`, {})
            .subscribe({
              next: res => {
                if (res.checkout_url) {
                  window.location.href = res.checkout_url;
                } else {
                  this.router.navigate(['/settings']);
                }
              },
              error: () => {
                this.router.navigate(['/settings']);
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

  loginForm: FormGroup = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
    email: [''],
    phone: [''],
    verificationCode: [''],
  });

  recaptchaVerifier: any;
  confirmationResult: any;
  resolver: any;
  verificationId = signal<string | null>(null);
  uid = signal<string>('');
  token = signal<string>('');

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const mode = params['mode'];
      if (mode === 'reset') {
        this.isResetMode.set(true);
        this.uid.set(params['uid'] || '');
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
    if (this.recaptchaVerifier) {
      try {
        this.recaptchaVerifier.clear();
      } catch (e) {
        console.error('Error clearing recaptcha verifier', e);
      }
      this.recaptchaVerifier = null;
    }
    const element = document.getElementById('recaptcha-container');
    if (element) {
      element.remove();
    }
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

    this.loginForm
      .get('phone')
      ?.setValidators([Validators.required, Validators.pattern(/^\+?[1-9]\d{1,14}$/)]);
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

  initRecaptcha(): void {
    if (this.recaptchaVerifier) return;
    if (!this.authService.auth) {
      console.error('Firebase Auth is not initialized');
      return;
    }
    try {
      let element = document.getElementById('recaptcha-container');
      if (!element) {
        element = document.createElement('div');
        element.id = 'recaptcha-container';
        document.body.appendChild(element);
      }
      this.recaptchaVerifier = new RecaptchaVerifier(this.authService.auth, element, {
        size: 'invisible',
        callback: () => undefined,
      });
    } catch (e) {
      console.error('Recaptcha init error', e);
    }
  }

  handleSuccess(): void {
    const action = this.route.snapshot.queryParams['action'];
    if (action === 'checkout') {
      return; // The effect will catch this and handle the redirect
    }
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/settings';
    this.router.navigateByUrl(returnUrl);
  }

  async sendVerificationCode() {
    this.error.set(null);
    const phoneNum = this.loginForm.value.phone;
    if (!phoneNum) {
      this.error.set('Phone number is required.');
      return;
    }
    this.initRecaptcha();
    this.isLoading.set(true);
    try {
      this.confirmationResult = await signInWithPhoneNumber(
        this.authService.auth,
        phoneNum,
        this.recaptchaVerifier,
      );
      this.codeSent.set(true);
      this.loginForm.get('verificationCode')?.setValidators([Validators.required]);
      this.loginForm.get('verificationCode')?.updateValueAndValidity();
    } catch (e: any) {
      console.error(e);
      this.error.set(
        'Failed to send verification code. Make sure you input international format (e.g. +11234567890).',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async verifyCode() {
    this.error.set(null);
    const code = this.loginForm.value.verificationCode;
    if (!code) {
      this.error.set('Verification code is required.');
      return;
    }
    this.isLoading.set(true);
    try {
      await this.confirmationResult.confirm(code);
      this.handleSuccess();
    } catch (e: any) {
      console.error(e);
      this.error.set('Invalid verification code.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async sendMfaVerificationCode(resolver: any) {
    this.initRecaptcha();
    try {
      const phoneInfoOptions = {
        multiFactorHint: resolver.hints[0],
        session: resolver.session,
      };
      const phoneAuthProvider = new PhoneAuthProvider(this.authService.auth);
      const verifyId = await phoneAuthProvider.verifyPhoneNumber(
        phoneInfoOptions,
        this.recaptchaVerifier,
      );
      this.verificationId.set(verifyId);
      this.resolver = resolver;
      this.mfaRequired.set(true);
      this.codeSent.set(true);
      this.loginForm.get('verificationCode')?.setValidators([Validators.required]);
      this.loginForm.get('verificationCode')?.updateValueAndValidity();
    } catch (e: any) {
      console.error(e);
      this.error.set('Failed to send MFA code. Please try again.');
    }
  }

  async resolveMfa() {
    this.error.set(null);
    const code = this.loginForm.value.verificationCode;
    const verifyId = this.verificationId();
    if (!code || !verifyId) {
      this.error.set('Verification code is required.');
      return;
    }
    this.isLoading.set(true);
    try {
      const cred = PhoneAuthProvider.credential(verifyId, code);
      const assertion = PhoneMultiFactorGenerator.assertion(cred);
      await this.resolver.resolveSignIn(assertion);
      this.handleSuccess();
    } catch (e: any) {
      console.error(e);
      this.error.set('MFA verification failed. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSubmit() {
    if (this.loginForm.invalid) return;

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
        const email = this.loginForm.value.email;
        const success = await this.authService.forgotPassword(email);
        if (success) {
          this.successMessage.set(
            'If that email exists in our records, we have sent a password reset link.',
          );
        } else {
          this.error.set('Failed to submit request. Please try again.');
        }
      } else if (this.isResetMode()) {
        const newPassword = this.loginForm.value.password;
        const success = await this.authService.resetPassword({
          uid: this.uid(),
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
              username: this.loginForm.value.username,
              password: this.loginForm.value.password,
              email: this.loginForm.value.email,
            })
          : await this.authService.login({
              username: this.loginForm.value.username,
              password: this.loginForm.value.password,
            });

        if (result.success) {
          this.handleSuccess();
        } else if (result.error === 'MFA_REQUIRED') {
          await this.sendMfaVerificationCode((result as any).resolver);
        } else {
          this.error.set(result.error || 'Authentication failed.');
        }
      }
    } catch (e: any) {
      console.error(e);
      this.error.set(
        'An error occurred during submission. Please check your credentials and try again.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  onCancel(): void {
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    this.router.navigateByUrl(returnUrl);
  }

  async signInWithApple() {
    this.error.set(null);
    this.successMessage.set(null);
    this.isLoading.set(true);
    try {
      const result = await this.authService.loginWithApple();
      if (result.success) {
        this.handleSuccess();
      } else if (result.error === 'MFA_REQUIRED') {
        await this.sendMfaVerificationCode((result as any).resolver);
      } else {
        this.error.set(result.error || 'Apple Sign-In failed.');
      }
    } catch (e: any) {
      console.error(e);
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
      } else if (result.error === 'MFA_REQUIRED') {
        await this.sendMfaVerificationCode((result as any).resolver);
      } else {
        this.error.set(result.error || 'Google Sign-In failed.');
      }
    } catch (e: any) {
      console.error(e);
      this.error.set('An error occurred during Google Sign-In. Please try again later.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
