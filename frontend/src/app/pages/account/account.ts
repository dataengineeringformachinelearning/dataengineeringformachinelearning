import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  signal,
  computed,
  ChangeDetectorRef,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import {
  VikingButton,
  VikingCallout,
  VikingField,
  VikingFormPanel,
  VikingFormSection,
  VikingIconText,
  VikingInput,
  VikingProgress,
  VikingPageHeader,
  VikingPageTemplate,
  VikingVerificationCodeField,
  VikingCard,
  VikingCardHeader,
  VikingCardTitle,
  VikingDisclosure,
  VikingPipelineFlow,
  VikingPreferencesPanel,
  VikingPreferencesService,
  VikingStack,
  type VikingPipelineStep,
} from '@dataengineeringformachinelearning/viking-ui';
import { VikingAppIcon } from '../../components/viking-app-icon/viking-app-icon';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { VikingDialogService } from '@dataengineeringformachinelearning/viking-ui';
import { MultiFactorInfo, RecaptchaVerifier, UserInfo, multiFactor } from 'firebase/auth';
import { environment } from '../../../environments/environment';
import {
  logFirebaseAuthError,
  mapFirebaseMfaError,
  mapFirebasePhoneError,
  normalizePhoneE164,
  phoneFormatHint,
  phoneValidationError,
} from '../../core/utils/phone.utils';

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
};

type BillingSyncResponse = {
  active: boolean;
  cancel_at_period_end?: boolean;
};

type SubscriptionUpdateResponse = { cancel_at_period_end: boolean };
type ApiKeyGenerateResponse = { key: string };

type WorkflowSummaryRow = {
  id: string;
  name: string;
  description?: string;
  default?: boolean;
  steps?: string[];
  pipeline_steps?: VikingPipelineStep[];
};

type WorkflowListResponse = {
  ok?: boolean;
  count?: number;
  workflows?: WorkflowSummaryRow[];
  degraded?: boolean;
};

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [
    CommonModule,
    VikingButton,
    VikingCallout,
    VikingField,
    VikingFormPanel,
    VikingFormSection,
    VikingIconText,
    VikingInput,
    VikingProgress,
    VikingPageHeader,
    VikingPageTemplate,
    VikingVerificationCodeField,
    VikingCard,
    VikingCardHeader,
    VikingCardTitle,
    VikingDisclosure,
    VikingPipelineFlow,
    VikingPreferencesPanel,
    VikingStack,
    VikingAppIcon,
    FormsModule,
    RouterModule,
  ],
  templateUrl: './account.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Account implements OnInit {
  public authService = inject(AuthService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private vikingDialog = inject(VikingDialogService);
  private preferences = inject(VikingPreferencesService);
  private titleService = inject(Title);
  private metaService = inject(Meta);

  protected openPreferencesDialog(): void {
    this.preferences.show();
  }

  get isViewer(): boolean {
    return this.authService.currentUserRole() === 'Viewer';
  }

  isDeletingAccount = signal<boolean>(false);
  apiKeys = signal<ApiKeyRow[]>([]);
  newApiKeyName = '';
  isGeneratingApiKey = signal<boolean>(false);
  newlyGeneratedKey = signal<string | null>(null);
  copiedApiKey = signal<boolean>(false);

  mfaPhoneNumber = '';
  mfaVerificationCode = '';
  mfaVerificationId: string | null = null;
  isMfaEnrolled = signal<boolean>(false);
  mfaEnrolledFactors = signal<MultiFactorInfo[]>([]);
  isSendingMfaCode = signal<boolean>(false);
  isVerifyingMfaCode = signal<boolean>(false);
  mfaError = signal<string | null>(null);
  mfaSuccess = signal<string | null>(null);
  mfaRecaptchaVerifier: RecaptchaVerifier | null = null;

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

  workflows = signal<WorkflowSummaryRow[]>([]);
  workflowsLoading = signal<boolean>(false);
  workflowsError = signal<string | null>(null);
  workflowsDegraded = signal<boolean>(false);

  /** Prefer DEML telemetry workflow, then platform default, then first catalog row. */
  primaryWorkflow = computed(() => {
    const list = this.workflows();
    return (
      list.find(w => w.id === 'threat_telemetry') ?? list.find(w => w.default) ?? list[0] ?? null
    );
  });

  otherWorkflows = computed(() => {
    const primary = this.primaryWorkflow();
    if (!primary) {
      return this.workflows();
    }
    return this.workflows().filter(w => w.id !== primary.id);
  });

  protected readonly phoneHint = phoneFormatHint;

  constructor() {
    effect(() => {
      if (this.authService.isInitialized()) {
        if (!this.authService.isAuthenticated()) {
          this.router.navigate(['/login']);
        } else if (this.authService.currentUserId() !== null) {
          void this.checkMfaStatus();
          this.checkLinkedProviders();
          this.loadApiKeys();
          this.loadWorkflows();
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
    this.http
      .post<BillingSyncResponse>(`${environment.backendUrl}/api/v1/billing/sync`, {})
      .subscribe({
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

  async cancelSubscription() {
    const ok = await this.vikingDialog.openConfirm({
      title: 'Cancel paid plan',
      message:
        'Cancel the legacy paid plan? It stays active until the billing cycle ends, then you return to the free rate-limited plan.',
      type: 'confirm',
      confirmBtnText: 'Cancel paid plan',
      confirmBtnColor: 'warn',
    });

    if (ok) {
      this.isBillingLoading.set(true);
      this.billingError.set(null);
      this.http
        .post<SubscriptionUpdateResponse>(
          `${environment.backendUrl}/api/v1/billing/cancel-subscription`,
          {},
        )
        .subscribe({
          next: res => {
            this.subscriptionCancelAtPeriodEnd.set(res.cancel_at_period_end);
            this.billingSuccess.set(
              'Paid plan cancelled. It remains active until the billing period ends.',
            );
            this.isBillingLoading.set(false);
            this.cdr.markForCheck();
          },
          error: err => {
            this.billingError.set(err.error?.error || 'Failed to cancel paid plan.');
            this.isBillingLoading.set(false);
            this.cdr.markForCheck();
          },
        });
    }
  }

  openPipelineStudio(): void {
    void this.router.navigate(['/pipeline']);
  }

  /** Map FORJD catalog rows into visual pipeline steps (YAML remains SoT). */
  pipelineStepsFor(workflow: WorkflowSummaryRow | null): VikingPipelineStep[] {
    if (!workflow) {
      return [];
    }
    if (workflow.pipeline_steps?.length) {
      return workflow.pipeline_steps;
    }
    return (workflow.steps ?? []).map(id => ({
      id,
      title: id.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      detail: '',
      kind: 'unknown',
    }));
  }

  loadWorkflows() {
    this.workflowsLoading.set(true);
    this.workflowsError.set(null);
    this.http.get<WorkflowListResponse>(`${environment.backendUrl}/api/v1/workflows`).subscribe({
      next: res => {
        this.workflows.set(Array.isArray(res.workflows) ? res.workflows : []);
        this.workflowsDegraded.set(Boolean(res.degraded));
        this.workflowsLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.workflows.set([]);
        this.workflowsDegraded.set(false);
        this.workflowsError.set('Could not load pipeline configuration. Try again shortly.');
        this.workflowsLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  loadApiKeys() {
    this.http.get<ApiKeyRow[]>(`${environment.backendUrl}/api/v1/auth/api-keys`).subscribe({
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
      .post<ApiKeyGenerateResponse>(`${environment.backendUrl}/api/v1/auth/api-keys/generate`, {
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
    const ok = await this.vikingDialog.openConfirm({
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
    const confirmed = await this.vikingDialog.openConfirm({
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
        const result = await this.authService.deleteAccount();
        this.isDeletingAccount.set(false);
        if (result.status === 'completed') {
          await this.vikingDialog.openConfirm({
            title: 'Account Deleted',
            message: 'Your account and all associated data have been permanently deleted.',
            type: 'alert',
            confirmBtnText: 'OK',
          });
          await this.router.navigate(['/']);
          window.location.reload();
        } else if (result.status === 'blocked') {
          await this.vikingDialog.openConfirm({
            title: 'Deletion Blocked',
            message: result.message,
            type: 'alert',
            confirmBtnText: 'OK',
            confirmBtnColor: 'warn',
          });
        } else {
          await this.vikingDialog.openConfirm({
            title: 'Deletion Failed',
            message: result.message,
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

  private clearMfaRecaptcha(): void {
    if (this.mfaRecaptchaVerifier) {
      try {
        this.mfaRecaptchaVerifier.clear();
      } catch (e) {
        console.error('Error clearing MFA reCAPTCHA verifier', e);
      }
      this.mfaRecaptchaVerifier = null;
    }
    // Keep the template slot; only remove dynamic body nodes.
    const dynamic = document.getElementById('mfa-recaptcha-container-dynamic');
    dynamic?.remove();
  }

  private async ensureMfaRecaptcha(): Promise<InstanceType<typeof RecaptchaVerifier>> {
    if (!this.authService.auth) {
      throw new Error('Firebase Auth is not initialized');
    }
    if (this.mfaRecaptchaVerifier) {
      return this.mfaRecaptchaVerifier;
    }
    let element = document.getElementById('mfa-recaptcha-container');
    if (!element) {
      element = document.createElement('div');
      element.id = 'mfa-recaptcha-container-dynamic';
      element.setAttribute(
        'style',
        'position:fixed;left:-9999px;width:1px;height:1px;overflow:hidden;',
      );
      document.body.appendChild(element);
    }
    this.mfaRecaptchaVerifier = new RecaptchaVerifier(this.authService.auth, element, {
      size: 'invisible',
      callback: () => undefined,
      'expired-callback': () => {
        this.clearMfaRecaptcha();
      },
      'error-callback': () => {
        this.clearMfaRecaptcha();
      },
    });
    await this.mfaRecaptchaVerifier.render();
    return this.mfaRecaptchaVerifier;
  }

  initMfaRecaptcha() {
    void this.ensureMfaRecaptcha().catch(e => logFirebaseAuthError('MFA reCAPTCHA init', e));
  }

  async checkMfaStatus() {
    const user = this.authService.auth?.currentUser;
    if (!user) return;

    try {
      if (typeof user.reload === 'function') {
        await user.reload();
      }
      const enrolled = multiFactor(user).enrolledFactors;
      this.mfaEnrolledFactors.set(enrolled);
      this.isMfaEnrolled.set(enrolled.length > 0);
      await this.authService.refreshMfaState();
      this.cdr.markForCheck();
    } catch (e) {
      console.warn('MFA check skipped or failed:', e);
    }
  }

  async sendMfaCode() {
    this.mfaError.set(null);
    this.mfaSuccess.set(null);
    const validationError = phoneValidationError(this.mfaPhoneNumber);
    if (validationError) {
      this.mfaError.set(validationError);
      return;
    }
    this.mfaPhoneNumber = normalizePhoneE164(this.mfaPhoneNumber);
    this.isSendingMfaCode.set(true);
    try {
      this.clearMfaRecaptcha();
      const verifier = await this.ensureMfaRecaptcha();
      this.mfaVerificationId = await this.authService.sendMfaEnrollmentCode(
        this.mfaPhoneNumber,
        verifier,
      );
      this.mfaSuccess.set('Verification code sent! Check your messages.');
      this.cdr.markForCheck();
    } catch (e: unknown) {
      logFirebaseAuthError('MFA enrollment SMS', e);
      this.clearMfaRecaptcha();
      const code =
        e && typeof e === 'object' && 'code' in e
          ? String((e as { code?: string }).code)
          : undefined;
      this.mfaError.set(mapFirebasePhoneError(code));
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
      this.mfaSuccess.set(
        'Multi-Factor Authentication enrolled. Sign out and sign back in so your session includes MFA verification before saving sites.',
      );
      this.mfaPhoneNumber = '';
      this.mfaVerificationCode = '';
      this.mfaVerificationId = null;
      await this.checkMfaStatus();
      this.cdr.markForCheck();
    } catch (e: unknown) {
      logFirebaseAuthError('MFA enrollment verify', e);
      const code =
        e && typeof e === 'object' && 'code' in e
          ? String((e as { code?: string }).code)
          : undefined;
      this.mfaError.set(mapFirebaseMfaError(code));
    } finally {
      this.isVerifyingMfaCode.set(false);
      this.cdr.markForCheck();
    }
  }

  async disableMfa() {
    this.mfaError.set(null);
    this.mfaSuccess.set(null);

    const ok = await this.vikingDialog.openConfirm({
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
          await this.checkMfaStatus();
          this.mfaSuccess.set('MFA has been disabled.');
          this.cdr.markForCheck();
        } catch (e: unknown) {
          logFirebaseAuthError('MFA disable', e);
          const code =
            e && typeof e === 'object' && 'code' in e ? String((e as { code?: string }).code) : '';
          if (code.includes('requires-recent-login')) {
            this.mfaError.set(
              'For security reasons, please sign out and sign back in before disabling MFA.',
            );
          } else {
            this.mfaError.set('Failed to disable MFA. Please try again later.');
          }
        }
      }
    }
  }

  checkLinkedProviders() {
    const user = this.authService.auth?.currentUser;
    if (user) {
      const providers = user.providerData
        ? user.providerData.map((provider: UserInfo) => provider.providerId)
        : [];
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
    const ok = await this.vikingDialog.openConfirm({
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
    const ok = await this.vikingDialog.openConfirm({
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
