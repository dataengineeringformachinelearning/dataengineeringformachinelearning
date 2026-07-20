import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  signal,
  ChangeDetectorRef,
  effect,
  afterNextRender,
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
import {
  VikingButton,
  VikingCallout,
  VikingCheckbox,
  VikingField,
  VikingInput,
  VikingPageHeader,
  VikingPageTemplate,
  VikingTextarea,
  VikingIcon,
  VikingCard,
  VikingCardHeader,
  VikingCardTitle,
  VikingFormGrid,
} from '@dataengineeringformachinelearning/viking-ui';
import { VikingAppIcon } from '../../components/viking-app-icon/viking-app-icon';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { VikingDialogService } from '@dataengineeringformachinelearning/viking-ui';
import { SettingsService } from '../../services/settings.service';
import { environment } from '../../../environments/environment';
import { apiErrorMessage } from '../../core/utils/api-error.utils';
import {
  UnifiedSelect,
  SelectOption,
} from '../../components/unified-select/unified-select.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    VikingButton,
    VikingCallout,
    VikingCheckbox,
    VikingField,
    VikingInput,
    VikingPageHeader,
    VikingPageTemplate,
    VikingTextarea,
    VikingIcon,
    VikingCard,
    VikingCardHeader,
    VikingCardTitle,
    VikingFormGrid,
    VikingAppIcon,
    FormsModule,
    RouterModule,
    UnifiedSelect,
  ],
  templateUrl: './settings.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings implements OnInit {
  private monitorService = inject(MonitorService);
  public mlService = inject(MlService);
  public authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private vikingDialog = inject(VikingDialogService);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  public settingsService = inject(SettingsService);

  statusPages = this.settingsService.statusPages;
  selectedPage = this.settingsService.selectedPage;

  get isViewer(): boolean {
    return this.authService.currentUserRole() === 'Viewer';
  }

  /** True when the user may create/update/delete sites (Viewer excluded, MFA session required). */
  get canMutateSites(): boolean {
    return !this.isViewer && this.authService.mfaVerifiedInSession();
  }

  private readonly docsBase = `${environment.marketingUrl ?? 'https://dataengineeringformachinelearning.com'}/documentation`;

  protected readonly platformIntegrations = [
    { name: 'Kubernetes', icon: 'kubernetes', guide: this.docsBase },
    { name: 'TensorFlow', icon: 'tensorflow', guide: this.docsBase },
    { name: 'PyTorch', icon: 'pytorch', guide: this.docsBase },
    { name: 'Apache Spark', icon: 'apache-spark', guide: this.docsBase },
    { name: 'Databricks', icon: 'databricks', guide: this.docsBase },
    { name: 'AWS Redshift', icon: 'aws-redshift', guide: this.docsBase },
  ] as const;

  editTitle = '';
  editSlug = '';
  editDescription = '';
  editIsPublished = false;
  editGoogleAnalyticsId = '';
  editMicrosoftClarityId = '';
  editCloudflareAnalyticsId = '';
  services = signal<MonitoredServiceData[]>([]);

  integrations = signal<IntegrationData[]>([]);
  endpoints = signal<any[]>([]);
  endpointsActive = signal<number>(0);
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
  public incidentStatusOptions: SelectOption[] = [
    { value: 'Investigating', label: 'Investigating' },
    { value: 'Identified', label: 'Identified' },
    { value: 'Monitoring', label: 'Monitoring' },
    { value: 'Resolved', label: 'Resolved' },
  ];

  copied = signal(false);

  isCreatingPage = signal<boolean>(false);
  isUpdatingPage = signal<boolean>(false);
  isAddingService = signal<boolean>(false);
  isAddingIncident = signal<boolean>(false);
  isRefreshingMfa = signal<boolean>(false);

  async refreshMfaSession(): Promise<void> {
    this.isRefreshingMfa.set(true);
    try {
      await this.authService.refreshMfaState(true);
    } finally {
      this.isRefreshingMfa.set(false);
      this.cdr.markForCheck();
    }
  }

  constructor() {
    afterNextRender(() => {
      this.loadIntegrations();
      void this.handleIntegrationOAuthReturn();
    });

    effect(() => {
      if (this.authService.isInitialized()) {
        if (!this.authService.isAuthenticated()) {
          this.router.navigate(['/']);
        } else if (this.authService.currentUserId() !== null) {
          // Force token refresh so MFA second-factor claims are re-read after SMS login.
          void this.authService.refreshMfaState(true);
          this.loadStatusPages();
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
    const statusAppUrl = this.getStatusAppUrl();
    const backendUrl = environment.backendUrl;
    return `<script src="${statusAppUrl}/assets/widget.js" async defer data-page-id="${page.slug}" data-backend-url="${backendUrl}" data-frontend-url="${statusAppUrl}"></script>`;
  }

  getWidgetCdnCode(): string {
    const page = this.selectedPage();
    if (!page) return '';
    const statusAppUrl = this.getStatusAppUrl();
    const backendUrl = environment.backendUrl;
    return `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@9.7.0/dist/viking-ui.css" />
<script type="module" src="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@9.7.0/dist/web-components.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@9.7.0/dist/widget.js" async defer data-page-id="${page.slug}" data-backend-url="${backendUrl}" data-frontend-url="${statusAppUrl}"></script>`;
  }

  /** Angular app origin — status pages and widget deep links (FRONTEND_URL). */
  private getStatusAppUrl(): string {
    return environment.frontendUrl ?? window.location.origin;
  }

  async copyWidgetCode() {
    const code = this.getWidgetCode();
    if (code) {
      try {
        await navigator.clipboard.writeText(code);
        this.copied.set(true);
        setTimeout(() => {
          this.copied.set(false);
          this.cdr.markForCheck();
        }, 2000);
        this.cdr.markForCheck();
      } catch (err) {
        console.error('Failed to copy', err);
      }
    }
  }

  ngOnInit(): void {
    this.titleService.setTitle('Sites - DEML');
    this.metaService.updateTag({
      name: 'description',
      content: 'Set up monitoring sites, health checks, and status widgets for your product.',
    });
  }

  loadIntegrations() {
    if (this.authService.isAuthenticated()) {
      this.monitorService.getIntegrations().subscribe({
        next: data => {
          if (Array.isArray(data)) {
            this.integrations.set(data);
          } else {
            this.integrations.set([]);
          }
          this.cdr.markForCheck();
        },
        error: err => console.error('Error fetching integrations:', err),
      });
    }
  }

  loadEndpoints() {
    if (this.authService.isAuthenticated()) {
      this.monitorService.getAllEndpoints().subscribe({
        next: data => {
          if (Array.isArray(data)) {
            const active = data.filter((d: any) => d.is_active).length;
            this.endpoints.set(data);
            this.endpointsActive.set(active);
          } else {
            this.endpoints.set([]);
            this.endpointsActive.set(0);
          }
        },
        error: err => console.error('Error fetching endpoints:', err),
      });
    }
  }

  loadStatusPages() {
    if (this.authService.isAuthenticated()) {
      this.monitorService.getStatusPages().subscribe({
        next: data => {
          if (!Array.isArray(data)) return;
          // Strictly filter to only the user's own pages, never show platform-status in settings
          const myPages = data.filter(
            p => p.user_id === this.authService.currentUserId() && p.slug !== 'platform-status',
          );
          this.statusPages.set(myPages);
          if (myPages.length > 0 && !this.selectedPage()) {
            this.selectPage(myPages[0]);
          }
        },
        error: err => console.error('Error fetching status pages:', err),
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
          error: async err => {
            console.error('Error creating page:', err);
            this.isCreatingPage.set(false);
            await this.vikingDialog.openConfirm({
              title: 'Creation Failed',
              message: apiErrorMessage(
                err,
                'Failed to create status page. The slug may already be in use.',
              ),
              type: 'alert',
              confirmBtnText: 'OK',
              confirmBtnColor: 'warn',
            });
          },
        });
    }
  }

  async deleteStatusPage(pageId: string) {
    const ok = await this.vikingDialog.openConfirm({
      title: 'Delete Status Page',
      message:
        'Are you sure you want to delete this status page? All monitored services and incidents will be removed.',
      type: 'confirm',
      confirmBtnText: 'Delete',
      confirmBtnColor: 'warn',
    });

    if (ok) {
      this.monitorService.deleteStatusPage(pageId).subscribe({
        next: () => {
          this.selectedPage.set(null);
          this.loadStatusPages();
        },
        error: async err => {
          await this.vikingDialog.openConfirm({
            title: 'Delete Failed',
            message: apiErrorMessage(err, 'Failed to delete status page.'),
            type: 'alert',
            confirmBtnText: 'OK',
            confirmBtnColor: 'warn',
          });
        },
      });
    }
  }

  selectPage(page: StatusPageData | null) {
    this.selectedPage.set(page);
  }

  updateStatusPage() {
    const page = this.selectedPage();
    const slug = this.editSlug.trim();
    const title = this.editTitle.trim();
    if (page && title && slug) {
      this.isUpdatingPage.set(true);
      this.monitorService
        .updateStatusPage(page.id, {
          title,
          slug,
          description: this.editDescription,
          is_published: this.editIsPublished,
          google_analytics_id: this.editGoogleAnalyticsId || undefined,
          microsoft_clarity_id: this.editMicrosoftClarityId || undefined,
          cloudflare_analytics_id: this.editCloudflareAnalyticsId || undefined,
        })
        .subscribe({
          next: async updated => {
            this.selectedPage.set(updated);
            this.loadStatusPages();
            this.isUpdatingPage.set(false);
            await this.vikingDialog.openConfirm({
              title: 'Settings Saved',
              message: 'Status page settings saved successfully.',
              type: 'alert',
              confirmBtnText: 'OK',
            });
          },
          error: async err => {
            console.error('Error updating status page:', err);
            this.isUpdatingPage.set(false);
            await this.vikingDialog.openConfirm({
              title: 'Update Failed',
              message: apiErrorMessage(
                err,
                'Failed to update status page. The slug may already be in use.',
              ),
              type: 'alert',
              confirmBtnText: 'OK',
              confirmBtnColor: 'warn',
            });
          },
        });
    }
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

  async addService() {
    const page = this.selectedPage();
    if (page && this.newServiceName && this.newServiceUrl) {
      // Check if URL is already used in current services
      const urlExists = this.services().some(
        s => s.url.toLowerCase() === this.newServiceUrl.toLowerCase(),
      );
      if (urlExists) {
        await this.vikingDialog.openConfirm({
          title: 'Duplicate Endpoint',
          message: 'This health check URL is already being monitored on this page.',
          type: 'alert',
          confirmBtnText: 'OK',
          confirmBtnColor: 'warn',
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
          error: async err => {
            await this.vikingDialog.openConfirm({
              title: 'Failed to Add Service',
              message: apiErrorMessage(
                err,
                'Failed to add monitored service. Verify the URL and try again.',
              ),
              type: 'alert',
              confirmBtnText: 'OK',
              confirmBtnColor: 'warn',
            });
            this.isAddingService.set(false);
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
      error: async err => {
        await this.vikingDialog.openConfirm({
          title: 'Delete Failed',
          message: apiErrorMessage(err, 'Failed to delete monitored service.'),
          type: 'alert',
          confirmBtnText: 'OK',
          confirmBtnColor: 'warn',
        });
      },
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
          error: async err => {
            this.isAddingIncident.set(false);
            await this.vikingDialog.openConfirm({
              title: 'Failed to Add Incident',
              message: apiErrorMessage(err, 'Failed to create incident report.'),
              type: 'alert',
              confirmBtnText: 'OK',
              confirmBtnColor: 'warn',
            });
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
      error: async err => {
        await this.vikingDialog.openConfirm({
          title: 'Delete Failed',
          message: apiErrorMessage(err, 'Failed to delete incident report.'),
          type: 'alert',
          confirmBtnText: 'OK',
          confirmBtnColor: 'warn',
        });
      },
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

  /** Surface Google Analytics OAuth redirect result (?integration=google&status=…). */
  private async handleIntegrationOAuthReturn(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    if (params.get('integration') !== 'google') {
      return;
    }
    const status = params.get('status') ?? '';
    const reason = params.get('reason') ?? '';
    this.loadIntegrations();
    if (status === 'success') {
      await this.vikingDialog.openConfirm({
        title: 'Google Analytics connected',
        message: 'GA4 OAuth completed. deml.app can read Analytics data for this account.',
        type: 'alert',
        confirmBtnText: 'OK',
      });
    } else if (status === 'failed') {
      const detail = reason ? ` Google reported: ${reason.replaceAll('_', ' ')}.` : '';
      await this.vikingDialog.openConfirm({
        title: 'Google Analytics connection failed',
        message:
          'OAuth consent may have succeeded, but the token exchange with Google failed.' +
          detail +
          ' Confirm the OAuth client secret and redirect URI match Google Cloud Console, then try again.',
        type: 'alert',
        confirmBtnText: 'OK',
        confirmBtnColor: 'warn',
      });
    }
    // Clear query params so refresh does not re-show the dialog.
    await this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
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
}
