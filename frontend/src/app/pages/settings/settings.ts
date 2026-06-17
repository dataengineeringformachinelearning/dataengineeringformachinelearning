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
import {
  MonitorService,
  StatusPageData,
  MonitoredServiceData,
  IntegrationData,
} from '../../services/monitor.service';
import { MlService } from '../../services/ml.service';
import { AuthService } from '../../services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatListModule } from '@angular/material/list';
import { Router, RouterModule } from '@angular/router';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialog } from '../../components/confirm-dialog/confirm-dialog';
import { RecaptchaVerifier, multiFactor } from 'firebase/auth';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatInputModule,
    MatFormFieldModule,
    FormsModule,
    MatListModule,
    RouterModule,
    MatCheckboxModule,
    MatDialogModule,
  ],
  templateUrl: './settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './settings.scss',
})
export class Settings implements OnInit {
  private monitorService = inject(MonitorService);
  public mlService = inject(MlService);
  public authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  public settingsService = inject(SettingsService);

  statusPages = this.settingsService.statusPages;
  selectedPage = this.settingsService.selectedPage;

  get isViewer(): boolean {
    return this.authService.currentUserRole() === 'Viewer';
  }

  editTitle = '';
  editSlug = '';
  editDescription = '';
  editIsPublished = false;
  editGoogleAnalyticsId = '';
  editMicrosoftClarityId = '';
  editCloudflareAnalyticsId = '';
  services = signal<MonitoredServiceData[]>([]);

  integrations = signal<IntegrationData[]>([]);
  isConnectingGoogle = signal<boolean>(false);
  isConnectingClarity = signal<boolean>(false);
  isConnectingCloudflare = signal<boolean>(false);
  clarityProjectId = '';
  clarityApiKey = '';
  cloudflareProjectId = '';
  cloudflareApiKey = '';

  newPageTitle = '';
  newPageSlug = '';
  newServiceName = '';
  newServiceUrl = '';

  incidents = signal<any[]>([]);

  newIncidentTitle = '';
  newIncidentMessage = '';
  newIncidentStatus = 'Investigating';

  copied = signal(false);

  isCreatingPage = signal<boolean>(false);
  isUpdatingPage = signal<boolean>(false);
  isAddingService = signal<boolean>(false);
  isAddingIncident = signal<boolean>(false);
  isDeletingAccount = signal<boolean>(false);

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

  constructor() {
    effect(() => {
      if (this.authService.isInitialized()) {
        if (!this.authService.isAuthenticated()) {
          this.router.navigate(['/']);
        } else if (this.authService.currentUserId() !== null) {
          this.loadStatusPages();
          this.checkMfaStatus();
          this.checkLinkedProviders();
        }
      }
    });

    effect(
      () => {
        const page = this.selectedPage();
        if (page) {
          this.loadServices(page.id);
          this.loadIncidents(page.id);
          this.editTitle = page.title;
          this.editSlug = page.slug;
          this.editDescription = page.description || '';
          this.editIsPublished = page.is_published || false;
          this.editGoogleAnalyticsId = page.google_analytics_id || '';
          this.editMicrosoftClarityId = page.microsoft_clarity_id || '';
          this.editCloudflareAnalyticsId = page.cloudflare_analytics_id || '';
        } else {
          this.editTitle = '';
          this.editSlug = '';
          this.editDescription = '';
          this.editIsPublished = false;
          this.editGoogleAnalyticsId = '';
          this.editMicrosoftClarityId = '';
          this.editCloudflareAnalyticsId = '';
          this.services.set([]);
        }
        this.cdr.markForCheck();
      },
      { allowSignalWrites: true },
    );
  }

  getWidgetCode(): string {
    const page = this.selectedPage();
    if (!page) return '';
    const origin = window.location.origin;
    return `<script src="${origin}/assets/widget.js" data-page-id="${page.slug}"></script>`;
  }

  copyWidgetCode() {
    const code = this.getWidgetCode();
    if (code) {
      navigator.clipboard.writeText(code).then(() => {
        this.copied.set(true);
        setTimeout(() => {
          this.copied.set(true); // wait, should reset to false
          this.copied.set(false);
          this.cdr.markForCheck();
        }, 2000);
        this.cdr.markForCheck();
      });
    }
  }

  ngOnInit() {
    this.titleService.setTitle(
      'Manage Status Pages & Incidents - Data Engineering for Machine Learning',
    );
    this.metaService.updateTag({
      name: 'description',
      content:
        'Configure your custom status pages, add monitored services, post incident updates, or manage account settings.',
    });
    this.loadStatusPages();
    this.loadIntegrations();
  }

  loadStatusPages() {
    if (this.authService.isAuthenticated()) {
      this.monitorService.getStatusPages().subscribe({
        next: data => {
          // Filter to only their pages, excluding platform-status
          const myPages = data.filter(
            p => p.user_id === this.authService.currentUserId() && p.slug !== 'platform-status',
          );
          this.statusPages.set(myPages);
          if (myPages.length > 0 && !this.selectedPage()) {
            this.selectPage(myPages[0]);
          }
          this.cdr.markForCheck();
        },
        error: err => console.error('Error fetching pages:', err),
      });
    }
  }

  createStatusPage() {
    if (this.newPageTitle && this.newPageSlug) {
      this.isCreatingPage.set(true);
      this.monitorService
        .createStatusPage({ title: this.newPageTitle, slug: this.newPageSlug })
        .subscribe({
          next: page => {
            this.loadStatusPages();
            this.newPageTitle = '';
            this.newPageSlug = '';
            this.selectPage(page);
            this.isCreatingPage.set(false);
          },
          error: err => {
            console.error('Error creating page:', err);
            this.isCreatingPage.set(false);
            this.dialog.open(ConfirmDialog, {
              width: '400px',
              data: {
                title: 'Creation Failed',
                message: 'Failed to create status page. The slug may already be in use.',
                type: 'alert',
                confirmBtnText: 'OK',
                confirmBtnColor: 'warn',
              },
            });
          },
        });
    }
  }

  deleteStatusPage(pageId: string) {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '450px',
      data: {
        title: 'Delete Status Page',
        message:
          'Are you sure you want to delete this status page? All monitored services and incidents will be removed.',
        type: 'confirm',
        confirmBtnText: 'Delete',
        confirmBtnColor: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.monitorService.deleteStatusPage(pageId).subscribe({
          next: () => {
            this.selectedPage.set(null);
            this.loadStatusPages();
          },
          error: err => console.error('Error deleting page:', err),
        });
      }
    });
  }

  selectPage(page: StatusPageData | null) {
    this.selectedPage.set(page);
  }

  updateStatusPage() {
    const page = this.selectedPage();
    if (page && this.editTitle && this.editSlug) {
      this.isUpdatingPage.set(true);
      this.monitorService
        .updateStatusPage(page.id, {
          title: this.editTitle,
          slug: this.editSlug,
          description: this.editDescription,
          is_published: this.editIsPublished,
          google_analytics_id: this.editGoogleAnalyticsId || undefined,
          microsoft_clarity_id: this.editMicrosoftClarityId || undefined,
          cloudflare_analytics_id: this.editCloudflareAnalyticsId || undefined,
        })
        .subscribe({
          next: updated => {
            this.selectedPage.set(updated);
            this.loadStatusPages();
            this.isUpdatingPage.set(false);
            this.dialog.open(ConfirmDialog, {
              width: '400px',
              data: {
                title: 'Settings Saved',
                message: 'Status page settings saved successfully.',
                type: 'alert',
                confirmBtnText: 'OK',
              },
            });
          },
          error: err => {
            console.error('Error updating status page:', err);
            this.isUpdatingPage.set(false);
            this.dialog.open(ConfirmDialog, {
              width: '400px',
              data: {
                title: 'Update Failed',
                message: 'Failed to update status page. Slug may already be taken.',
                type: 'alert',
                confirmBtnText: 'OK',
                confirmBtnColor: 'warn',
              },
            });
          },
        });
    }
  }

  deleteAccount() {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '450px',
      data: {
        title: 'Delete Account Permanently',
        message:
          'CRITICAL WARNING: Are you sure you want to permanently delete your account? All of your status pages, monitored services, incident reports, and telemetry data will be permanently and irreversibly destroyed.',
        type: 'prompt',
        confirmText: 'DELETE MY ACCOUNT',
        confirmBtnText: 'Delete Account',
        confirmBtnColor: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.isDeletingAccount.set(true);
        this.authService
          .deleteAccount()
          .then(async success => {
            this.isDeletingAccount.set(false);
            if (success) {
              const successDialog = this.dialog.open(ConfirmDialog, {
                width: '400px',
                data: {
                  title: 'Account Deleted',
                  message: 'Your account and all associated data have been permanently deleted.',
                  type: 'alert',
                  confirmBtnText: 'OK',
                },
              });
              successDialog.afterClosed().subscribe(async () => {
                await this.router.navigate(['/']);
                window.location.reload();
              });
            } else {
              this.dialog.open(ConfirmDialog, {
                width: '400px',
                data: {
                  title: 'Deletion Failed',
                  message: 'Failed to delete account.',
                  type: 'alert',
                  confirmBtnText: 'OK',
                  confirmBtnColor: 'warn',
                },
              });
            }
          })
          .catch(err => {
            this.isDeletingAccount.set(false);
            console.error(err);
          });
      }
    });
  }

  loadServices(pageId: string) {
    this.monitorService.getServices(pageId).subscribe({
      next: data => {
        this.services.set(data);
        this.cdr.markForCheck();
      },
      error: err => console.error('Error fetching services:', err),
    });
  }

  loadIncidents(pageId: string) {
    this.monitorService.getIncidents(pageId).subscribe({
      next: data => {
        this.incidents.set(data);
        this.cdr.markForCheck();
      },
      error: err => console.error('Error fetching incidents:', err),
    });
  }

  addService() {
    const page = this.selectedPage();
    if (page && this.newServiceName && this.newServiceUrl) {
      // Check if URL is already used in current services
      const urlExists = this.services().some(
        s => s.url.toLowerCase() === this.newServiceUrl.toLowerCase(),
      );
      if (urlExists) {
        this.dialog.open(ConfirmDialog, {
          width: '400px',
          data: {
            title: 'Duplicate Endpoint',
            message: 'This health check URL is already being monitored on this page.',
            type: 'alert',
            confirmBtnText: 'OK',
            confirmBtnColor: 'warn',
          },
        });
        return;
      }

      this.isAddingService.set(true);
      this.monitorService
        .addService(page.id, { name: this.newServiceName, url: this.newServiceUrl })
        .subscribe({
          next: () => {
            this.loadServices(page.id);
            this.newServiceName = '';
            this.newServiceUrl = '';
            this.isAddingService.set(false);
          },
          error: err => {
            console.error('Error adding service:', err);
            this.isAddingService.set(false);
            this.dialog.open(ConfirmDialog, {
              width: '400px',
              data: {
                title: 'Failed to Add Service',
                message:
                  'An error occurred while adding the monitored service. Please verify the URL and try again.',
                type: 'alert',
                confirmBtnText: 'OK',
                confirmBtnColor: 'warn',
              },
            });
          },
        });
    }
  }

  deleteService(serviceId: string) {
    this.monitorService.deleteService(serviceId).subscribe({
      next: () => {
        const page = this.selectedPage();
        if (page) this.loadServices(page.id);
      },
      error: err => console.error('Error deleting service:', err),
    });
  }

  addIncident() {
    const page = this.selectedPage();
    if (page && this.newIncidentTitle && this.newIncidentMessage && this.newIncidentStatus) {
      this.isAddingIncident.set(true);
      this.monitorService
        .createIncident(page.id, {
          title: this.newIncidentTitle,
          message: this.newIncidentMessage,
          status: this.newIncidentStatus,
        })
        .subscribe({
          next: () => {
            this.loadIncidents(page.id);
            this.newIncidentTitle = '';
            this.newIncidentMessage = '';
            this.newIncidentStatus = 'Investigating';
            this.isAddingIncident.set(false);
          },
          error: err => {
            console.error('Error adding incident:', err);
            this.isAddingIncident.set(false);
          },
        });
    }
  }

  deleteIncident(incidentId: string) {
    this.monitorService.deleteIncident(incidentId).subscribe({
      next: () => {
        const page = this.selectedPage();
        if (page) this.loadIncidents(page.id);
      },
      error: err => console.error('Error deleting incident:', err),
    });
  }

  loadIntegrations() {
    this.monitorService.getIntegrations().subscribe({
      next: data => {
        this.integrations.set(data);
        this.cdr.markForCheck();
      },
      error: err => console.error('Error loading integrations:', err),
    });
  }

  connectGoogleAnalytics() {
    this.isConnectingGoogle.set(true);
    this.monitorService.getGoogleAuthUrl().subscribe({
      next: res => {
        if (res.url) {
          window.location.href = res.url;
        }
        this.isConnectingGoogle.set(false);
      },
      error: err => {
        console.error('Error fetching auth URL:', err);
        this.isConnectingGoogle.set(false);
      },
    });
  }

  connectMicrosoftClarity() {
    if (this.clarityProjectId && this.clarityApiKey) {
      this.isConnectingClarity.set(true);
      this.monitorService
        .saveClarityIntegration({
          project_id: this.clarityProjectId,
          api_key: this.clarityApiKey,
        })
        .subscribe({
          next: () => {
            this.loadIntegrations();
            this.clarityProjectId = '';
            this.clarityApiKey = '';
            this.isConnectingClarity.set(false);
            this.cdr.markForCheck();
          },
          error: err => {
            console.error('Error saving clarity integration:', err);
            this.isConnectingClarity.set(false);
          },
        });
    }
  }

  connectCloudflare() {
    if (this.cloudflareProjectId && this.cloudflareApiKey) {
      this.isConnectingCloudflare.set(true);
      this.monitorService
        .saveCloudflareIntegration({
          project_id: this.cloudflareProjectId,
          api_key: this.cloudflareApiKey,
        })
        .subscribe({
          next: () => {
            this.loadIntegrations();
            this.cloudflareProjectId = '';
            this.cloudflareApiKey = '';
            this.isConnectingCloudflare.set(false);
            this.cdr.markForCheck();
          },
          error: err => {
            console.error('Error saving cloudflare integration:', err);
            this.isConnectingCloudflare.set(false);
          },
        });
    }
  }

  disconnectIntegration(id: string) {
    this.monitorService.deleteIntegration(id).subscribe({
      next: () => {
        this.loadIntegrations();
      },
      error: err => console.error('Error deleting integration:', err),
    });
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
        callback: () => {},
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
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Disable Multi-Factor Authentication',
        message: 'Are you sure you want to disable MFA? Your account will be less secure.',
        type: 'confirm',
        confirmBtnText: 'Disable',
        confirmBtnColor: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe(async confirmed => {
      if (confirmed) {
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
    });
  }

  checkLinkedProviders() {
    const user = this.authService.auth?.currentUser;
    if (user) {
      const providers = user.providerData.map((p: any) => p.providerId);
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
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Unlink Google Account',
        message:
          'Are you sure you want to disconnect your Google account? You will no longer be able to log in using Google.',
        type: 'confirm',
        confirmBtnText: 'Unlink',
        confirmBtnColor: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe(async confirmed => {
      if (confirmed) {
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
    });
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
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        title: 'Unlink Apple ID',
        message:
          'Are you sure you want to disconnect your Apple ID? You will no longer be able to log in using Apple.',
        type: 'confirm',
        confirmBtnText: 'Unlink',
        confirmBtnColor: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe(async confirmed => {
      if (confirmed) {
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
    });
  }
}
