import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  signal,
  ChangeDetectorRef,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import {
  FluxButton,
  FluxField,
  FluxInput,
  FluxProgress,
} from '@deml/flux-material';
import { FluxAppIcon } from '../../components/flux-app-icon/flux-app-icon';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FluxDialogService } from '../../services/flux-dialog.service';
import { RecaptchaVerifier, multiFactor } from 'firebase/auth';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [
    CommonModule,
    FluxButton,
    FluxField,
    FluxInput,
    FluxProgress,
    FluxAppIcon,
    FormsModule,
    RouterModule,
  ],
  templateUrl: './account.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './account.scss',
})
export class Account implements OnInit {
  public authService = inject(AuthService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private fluxDialog = inject(FluxDialogService);
  private titleService = inject(Title);
  private metaService = inject(Meta);

  get isViewer(): boolean {
    return this.authService.currentUserRole() === 'Viewer';
  }

  isDeletingAccount = signal<boolean>(false);
  apiKeys = signal<any[]>([]);
  newApiKeyName = '';
  isGeneratingApiKey = signal<boolean>(false);
  newlyGeneratedKey = signal<string | null>(null);
  copiedApiKey = signal<boolean>(false);

  mfaPhoneNumber = '';
  mfaVerificationCode = '';
  mfaVerificationId: string | null = null;
  isMfaEnrolled = signal<boolean>(false);
  mfaEnrolledFactors = signal<any[]>([]);
  isSendingMfaCode = signal<boolean>(false);
  isVerifyingMfaCode = signal<boolean>(false);
  mfaError = signal<string | null>(null);
  mfaSuccess = signal<string | null>(null);
  mfaRecaptchaVerifier: any = null;

  isGoogleLinked = signal<boolean>(false);
  isAppleLinked = signal<boolean>(false);
  providerError = signal<string | null>(null);
  providerSuccess = signal<string | null>(null);

  updateEmailInput = '';
  updatePasswordInput = '';
  isUpdatingEmail = signal<boolean>(false);
  isUpdatingPassword = signal<boolean>(false);
  accountSuccess = signal<string | null>(null);
  accountError = signal<string | null>(null);

  isBillingLoading = signal<boolean>(false);
  subscriptionActive = signal<boolean>(false);
  subscriptionCancelAtPeriodEnd = signal<boolean>(false);
  billingSuccess = signal<string | null>(null);
  billingError = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.authService.isInitialized()) {
        if (!this.authService.isAuthenticated()) {
          this.router.navigate(['/login']);
        } else if (this.authService.currentUserId() !== null) {
          this.checkMfaStatus();
          this.checkLinkedProviders();
          this.loadApiKeys();
        }
      }
    });
  }

  ngOnInit(): void {
    this.titleService.setTitle('Account - DEML');
    this.metaService.updateTag({
      name: 'description',
      content: 'Manage your DEML account, billing, security, and API keys.',
    });

    if (this.authService.isAuthenticated()) {
      this.fetchSubscriptionStatus();
    }
  }

  fetchSubscriptionStatus() {
    this.isBillingLoading.set(true);
    this.http.post<any>(`${environment.backendUrl}/api/v1/billing/sync`, {}).subscribe({
      next: res => {
        this.subscriptionActive.set(res.active);
        this.subscriptionCancelAtPeriodEnd.set(res.cancel_at_period_end || false);
        this.isBillingLoading.set(false);
      },
      error: () => {
        this.isBillingLoading.set(false);
      },
    });
  }

  async updateEmail() {
    if (!this.updateEmailInput) return;
    this.isUpdatingEmail.set(true);
    this.accountError.set(null);
    this.accountSuccess.set(null);
    const res = await this.authService.updateUserEmail(this.updateEmailInput);
    if (res.status === 'success') {
      this.accountSuccess.set('Email updated successfully.');
      this.updateEmailInput = '';
    } else {
      this.accountError.set(res.message || 'Failed to update email.');
    }
    this.isUpdatingEmail.set(false);
    this.cdr.markForCheck();
  }

  async updatePassword() {
    if (!this.updatePasswordInput) return;
    this.isUpdatingPassword.set(true);
    this.accountError.set(null);
    this.accountSuccess.set(null);
    const res = await this.authService.updateUserPassword(this.updatePasswordInput);
    if (res.status === 'success') {
      this.accountSuccess.set('Password updated successfully.');
      this.updatePasswordInput = '';
    } else {
      this.accountError.set(res.message || 'Failed to update password.');
    }
    this.isUpdatingPassword.set(false);
    this.cdr.markForCheck();
  }

  subscribeToPro() {
    this.isBillingLoading.set(true);
    this.billingError.set(null);
    this.http
      .post<any>(`${environment.backendUrl}/api/v1/billing/create-checkout-session`, {})
      .subscribe({
        next: res => {
          if (res.checkout_url) {
            window.location.href = res.checkout_url;
          } else {
            this.billingError.set('Failed to initialize checkout.');
            this.isBillingLoading.set(false);
          }
        },
        error: err => {
          this.billingError.set(err.error?.error || 'Failed to initialize checkout.');
          this.isBillingLoading.set(false);
        },
      });
  }

  async cancelSubscription() {
    const ok = await this.fluxDialog.openConfirm({
      title: 'Cancel Subscription',
      message:
        'Are you sure you want to cancel your Pro subscription? It will remain active until the end of your billing cycle.',
      type: 'confirm',
      confirmBtnText: 'Cancel Subscription',
      confirmBtnColor: 'warn',
    });

    if (ok) {
      this.isBillingLoading.set(true);
      this.billingError.set(null);
      this.http
        .post<any>(`${environment.backendUrl}/api/v1/billing/cancel-subscription`, {})
        .subscribe({
          next: res => {
            this.subscriptionCancelAtPeriodEnd.set(res.cancel_at_period_end);
            this.billingSuccess.set(
              'Subscription cancelled. It will remain active until the end of the billing period.',
            );
            this.isBillingLoading.set(false);
            this.cdr.markForCheck();
          },
          error: err => {
            this.billingError.set(err.error?.error || 'Failed to cancel subscription.');
            this.isBillingLoading.set(false);
            this.cdr.markForCheck();
          },
        });
    }
  }

  resumeSubscription() {
    this.isBillingLoading.set(true);
    this.billingError.set(null);
    this.http
      .post<any>(`${environment.backendUrl}/api/v1/billing/resume-subscription`, {})
      .subscribe({
        next: res => {
          this.subscriptionCancelAtPeriodEnd.set(res.cancel_at_period_end);
          this.billingSuccess.set('Subscription resumed successfully.');
          this.isBillingLoading.set(false);
          this.cdr.markForCheck();
        },
        error: err => {
          this.billingError.set(err.error?.error || 'Failed to resume subscription.');
          this.isBillingLoading.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  loadApiKeys() {
    this.http.get<any[]>(`${environment.backendUrl}/api/v1/auth/api-keys`).subscribe({
      next: keys => {
        this.apiKeys.set(keys);
        this.cdr.markForCheck();
      },
      error: err => console.error('Error fetching API keys:', err),
    });
  }

  generateApiKey() {
    if (!this.newApiKeyName) return;
    this.isGeneratingApiKey.set(true);
    this.http
      .post<any>(`${environment.backendUrl}/api/v1/auth/api-keys/generate`, {
        name: this.newApiKeyName,
      })
      .subscribe({
        next: res => {
          this.newlyGeneratedKey.set(res.key);
          this.newApiKeyName = '';
          this.isGeneratingApiKey.set(false);
          this.loadApiKeys();
          this.cdr.markForCheck();
        },
        error: err => {
          console.error('Error generating API key:', err);
          this.isGeneratingApiKey.set(false);
        },
      });
  }

  async revokeApiKey(id: string) {
    const ok = await this.fluxDialog.openConfirm({
      title: 'Revoke API Key',
      message:
        'Are you sure you want to revoke this API key? Systems using it will immediately lose access.',
      type: 'confirm',
      confirmBtnText: 'Revoke',
      confirmBtnColor: 'warn',
    });

    if (ok) {
      this.http.delete(`${environment.backendUrl}/api/v1/auth/api-keys/${id}`).subscribe({
        next: () => this.loadApiKeys(),
        error: err => console.error('Error revoking key:', err),
      });
    }
  }

  async copyApiKey() {
    const key = this.newlyGeneratedKey();
    if (key) {
      try {
        await navigator.clipboard.writeText(key);
        this.copiedApiKey.set(true);
        setTimeout(() => {
          this.copiedApiKey.set(false);
          this.cdr.markForCheck();
        }, 2000);
        this.cdr.markForCheck();
      } catch (err) {
        console.error('Failed to copy', err);
      }
    }
  }

  async deleteAccount() {
    const confirmed = await this.fluxDialog.openConfirm({
      title: 'Delete Account Permanently',
      message:
        'CRITICAL WARNING: Are you sure you want to permanently delete your account? All of your status pages, monitored services, incident reports, and telemetry data will be permanently and irreversibly destroyed.',
      type: 'prompt',
      confirmText: 'DELETE MY ACCOUNT',
      confirmBtnText: 'Delete Account',
      confirmBtnColor: 'warn',
    });

    if (confirmed) {
      this.isDeletingAccount.set(true);
      try {
        const success = await this.authService.deleteAccount();
        this.isDeletingAccount.set(false);
        if (success) {
          await this.fluxDialog.openConfirm({
            title: 'Account Deleted',
            message: 'Your account and all associated data have been permanently deleted.',
            type: 'alert',
            confirmBtnText: 'OK',
          });
          await this.router.navigate(['/']);
          window.location.reload();
        } else {
          await this.fluxDialog.openConfirm({
            title: 'Deletion Failed',
            message: 'Failed to delete account.',
            type: 'alert',
            confirmBtnText: 'OK',
            confirmBtnColor: 'warn',
          });
        }
      } catch (err) {
        this.isDeletingAccount.set(false);
        console.error(err);
      }
    }
  }

  initMfaRecaptcha() {
    if (this.mfaRecaptchaVerifier) return;
    if (!this.authService.auth) {
      console.error('Firebase Auth is not initialized');
      return;
    }
    try {
      let element = document.getElementById('mfa-recaptcha-container');
      if (!element) {
        element = document.createElement('div');
        element.id = 'mfa-recaptcha-container';
        document.body.appendChild(element);
      }
      this.mfaRecaptchaVerifier = new RecaptchaVerifier(this.authService.auth, element, {
        size: 'invisible',
        callback: () => undefined,
      });
    } catch (e) {
      console.error('MFA Recaptcha init error', e);
    }
  }

  checkMfaStatus() {
    const user = this.authService.auth?.currentUser;
    if (user && typeof user.reload === 'function') {
      try {
        const enrolled = multiFactor(user).enrolledFactors;
        this.mfaEnrolledFactors.set(enrolled);
        this.isMfaEnrolled.set(enrolled.length > 0);
      } catch (e) {
        console.warn('MFA check skipped or failed:', e);
      }
    }
  }

  async sendMfaCode() {
    this.mfaError.set(null);
    this.mfaSuccess.set(null);
    if (!this.mfaPhoneNumber) {
      this.mfaError.set('Phone number is required.');
      return;
    }
    this.initMfaRecaptcha();
    this.isSendingMfaCode.set(true);
    try {
      this.mfaVerificationId = await this.authService.sendMfaEnrollmentCode(
        this.mfaPhoneNumber,
        this.mfaRecaptchaVerifier,
      );
      this.mfaSuccess.set('Verification code sent! Please check your messages.');
      this.cdr.markForCheck();
    } catch (e: any) {
      console.error(e);
      this.mfaError.set(
        'Failed to send verification code. Please check the phone number and try again.',
      );
    } finally {
      this.isSendingMfaCode.set(false);
      this.cdr.markForCheck();
    }
  }

  async verifyMfaCode() {
    this.mfaError.set(null);
    this.mfaSuccess.set(null);
    if (!this.mfaVerificationId || !this.mfaVerificationCode) {
      this.mfaError.set('Verification code is required.');
      return;
    }
    this.isVerifyingMfaCode.set(true);
    try {
      await this.authService.confirmMfaEnrollment(this.mfaVerificationId, this.mfaVerificationCode);
      this.mfaSuccess.set('Multi-Factor Authentication enrolled successfully!');
      this.mfaPhoneNumber = '';
      this.mfaVerificationCode = '';
      this.mfaVerificationId = null;
      this.checkMfaStatus();
      this.cdr.markForCheck();
    } catch (e: any) {
      console.error(e);
      this.mfaError.set(
        'MFA enrollment failed. The verification code may be incorrect or expired.',
      );
    } finally {
      this.isVerifyingMfaCode.set(false);
      this.cdr.markForCheck();
    }
  }

  async disableMfa() {
    const ok = await this.fluxDialog.openConfirm({
      title: 'Disable Multi-Factor Authentication',
      message: 'Are you sure you want to disable MFA? Your account will be less secure.',
      type: 'confirm',
      confirmBtnText: 'Disable',
      confirmBtnColor: 'warn',
    });

    if (ok) {
      const factors = this.mfaEnrolledFactors();
      if (factors.length > 0) {
        try {
          await this.authService.unenrollMfa(factors[0]);
          this.checkMfaStatus();
          this.mfaSuccess.set('MFA has been disabled.');
          this.cdr.markForCheck();
        } catch (e: any) {
          console.error(e);
          this.mfaError.set('Failed to disable MFA. Please try again later.');
        }
      }
    }
  }

  checkLinkedProviders() {
    const user = this.authService.auth?.currentUser;
    if (user) {
      const providers = user.providerData ? user.providerData.map((p: any) => p.providerId) : [];
      this.isGoogleLinked.set(providers.includes('google.com'));
      this.isAppleLinked.set(providers.includes('apple.com'));
      this.cdr.markForCheck();
    }
  }

  async linkGoogle() {
    this.providerError.set(null);
    this.providerSuccess.set(null);
    const result = await this.authService.linkGoogleAccount();
    if (result.success) {
      this.providerSuccess.set('Google account linked successfully!');
      this.checkLinkedProviders();
    } else {
      this.providerError.set(result.error || 'Failed to link Google account.');
    }
    this.cdr.markForCheck();
  }

  async unlinkGoogle() {
    const ok = await this.fluxDialog.openConfirm({
      title: 'Unlink Google Account',
      message:
        'Are you sure you want to disconnect your Google account? You will no longer be able to log in using Google.',
      type: 'confirm',
      confirmBtnText: 'Unlink',
      confirmBtnColor: 'warn',
    });

    if (ok) {
      this.providerError.set(null);
      this.providerSuccess.set(null);
      const result = await this.authService.unlinkProvider('google.com');
      if (result.success) {
        this.providerSuccess.set('Google account disconnected successfully.');
        this.checkLinkedProviders();
      } else {
        this.providerError.set(result.error || 'Failed to unlink Google account.');
      }
      this.cdr.markForCheck();
    }
  }

  async linkApple() {
    this.providerError.set(null);
    this.providerSuccess.set(null);
    const result = await this.authService.linkAppleAccount();
    if (result.success) {
      this.providerSuccess.set('Apple ID linked successfully!');
      this.checkLinkedProviders();
    } else {
      this.providerError.set(result.error || 'Failed to link Apple ID.');
    }
    this.cdr.markForCheck();
  }

  async unlinkApple() {
    const ok = await this.fluxDialog.openConfirm({
      title: 'Unlink Apple ID',
      message:
        'Are you sure you want to disconnect your Apple ID? You will no longer be able to log in using Apple.',
      type: 'confirm',
      confirmBtnText: 'Unlink',
      confirmBtnColor: 'warn',
    });

    if (ok) {
      this.providerError.set(null);
      this.providerSuccess.set(null);
      const result = await this.authService.unlinkProvider('apple.com');
      if (result.success) {
        this.providerSuccess.set('Apple ID disconnected successfully.');
        this.checkLinkedProviders();
      } else {
        this.providerError.set(result.error || 'Failed to unlink Apple ID.');
      }
      this.cdr.markForCheck();
    }
  }
}
