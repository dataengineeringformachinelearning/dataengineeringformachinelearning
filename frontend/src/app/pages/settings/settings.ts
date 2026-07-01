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
import { SettingsService } from '../../services/settings.service';
import { environment } from '../../../environments/environment';
import {
  UnifiedSelect,
  SelectOption,
} from '../../components/unified-select/unified-select.component';
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
    UnifiedSelect,
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
  constructor() {
    afterNextRender(() => {
      this.loadIntegrations();
    });

    effect(() => {
      if (this.authService.isInitialized()) {
        if (!this.authService.isAuthenticated()) {
          this.router.navigate(['/']);
        } else if (this.authService.currentUserId() !== null) {
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
    this.titleService.setTitle('Site Setup - DEML');
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
}
