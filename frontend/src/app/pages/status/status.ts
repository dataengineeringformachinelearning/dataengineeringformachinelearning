import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  signal,
  effect,
  afterNextRender,
  Injector,
} from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import {
  IncidentData,
  MonitorService,
  MonitoredServiceData,
  StatusPageData,
} from '../../services/monitor.service';
import { MlService } from '../../services/ml.service';
import { AuthService } from '../../services/auth.service';
import {
  VikingButton,
  VikingCallout,
  VikingPageHeader,
  VikingPageTemplate,
  VikingPageSkeleton,
  VikingStatusDashboard,
} from '@dataengineeringformachinelearning/viking-ui';
import type {
  StatusDashboardAnnouncement,
  StatusDashboardMetric,
  StatusDashboardService,
  UptimeHistoryDataPoint,
} from '@dataengineeringformachinelearning/viking-ui';
import { RouterModule, Router } from '@angular/router';
import { StatusCta } from '../../components/status-cta/status-cta';
import { SanityService } from '../../services/sanity.service';
import { formatServiceName } from '../../core/utils/formatter.utils';
import { resolveUptimeHistory } from '../../core/utils/uptime.utils';

import { firstValueFrom, timeout } from 'rxjs';
import { ConnectivityService } from '../../services/connectivity.service';
import {
  FORJD_FALLBACK_BODY,
  OFFLINE_BODY,
  OFFLINE_HEADING,
  STATUS_CONNECT_BODY,
  STATUS_CONNECT_HEADING,
  STATUS_RETRY_LABEL,
} from '../../core/continuity-copy';
import { ContinuityHealthSignal, continuityFromReady } from '../../core/continuity-health';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-status',
  standalone: true,
  imports: [
    VikingButton,
    VikingCallout,
    VikingPageHeader,
    VikingPageTemplate,
    VikingPageSkeleton,
    VikingStatusDashboard,
    RouterModule,
    StatusCta,
  ],
  templateUrl: './status.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Status implements OnInit {
  private monitorService = inject(MonitorService);
  public mlService = inject(MlService);
  public authService = inject(AuthService);
  readonly connectivity = inject(ConnectivityService);
  private router = inject(Router);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  public sanityService = inject(SanityService);
  private injector = inject(Injector);
  private http = inject(HttpClient);

  readonly connectHeading = STATUS_CONNECT_HEADING;
  readonly connectBody = STATUS_CONNECT_BODY;
  readonly offlineHeading = OFFLINE_HEADING;
  readonly offlineBody = OFFLINE_BODY;
  readonly retryLabel = STATUS_RETRY_LABEL;
  readonly forjdFallbackBody = FORJD_FALLBACK_BODY;

  /** Soft control-plane continuity (DEML `/ready` → FORJD). */
  readonly controlPlaneReady = signal<ContinuityHealthSignal>('checking');

  statusPages = signal<StatusPageData[]>([]);
  loadFailed = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  incidentsMap = this.monitorService.incidentsMap;
  servicesMap = this.monitorService.servicesMap;
  formatServiceName = formatServiceName;

  announcementTone(severity?: string | null): 'accent' | 'warning' | 'danger' | 'muted' {
    const key = (severity || 'info').toLowerCase();
    if (key === 'critical' || key === 'error' || key === 'danger') return 'danger';
    if (key === 'warning') return 'warning';
    if (key === 'info' || key === 'primary') return 'accent';
    return 'muted';
  }

  /** Seed card for headless crawlers only (not used as a loading UI). */
  private readonly crawlerPlaceholder: StatusPageData = {
    id: 'loading-placeholder',
    title: 'Platform Status Feed',
    slug: 'platform-status',
    description: 'Telemetry and status monitoring for machine learning pipelines.',
    created_at: new Date().toISOString(),
    user_id: null,
  };

  getPageStatus(pageId: string): string {
    const active = this.activeIncidents(pageId);
    if (active.length > 0) {
      return active[0].status;
    }
    const services = this.servicesMap()[pageId] || [];
    if (services.some(service => this.statusVariant(service.status) === 'outage')) {
      return 'Outage';
    }
    if (services.some(service => this.statusVariant(service.status) === 'degraded')) {
      return 'Degraded';
    }
    return 'Operational';
  }

  statusVariant(status?: string | null): 'operational' | 'degraded' | 'outage' | 'maintenance' {
    const value = (status || 'Operational').toLowerCase().replace(/[\s-]+/g, '_');
    if (value === 'outage' || value === 'major_outage' || value === 'down') return 'outage';
    if (value === 'degraded' || value === 'partial_outage' || value === 'partial') {
      return 'degraded';
    }
    if (value === 'maintenance') return 'maintenance';
    return 'operational';
  }

  statusDescription(pageId: string): string {
    const status = this.getPageStatus(pageId);
    if (status === 'Operational') return 'All systems are functioning normally.';
    if (status === 'Degraded') return 'Some services are experiencing degraded performance.';
    if (status === 'Maintenance') return 'Planned maintenance is currently in progress.';
    return 'Some services are currently experiencing downtime.';
  }

  activeIncidents(pageId: string): IncidentData[] {
    return (this.incidentsMap()[pageId] || []).filter(incident => incident.status !== 'Resolved');
  }

  serviceUptime(page: StatusPageData, service: MonitoredServiceData): number {
    return service.sla ?? page.overall_uptime ?? page.cumulative_sla ?? 100;
  }

  dashboardMetrics = (page: StatusPageData): StatusDashboardMetric[] => {
    const sla = page.cumulative_sla ?? page.overall_uptime;
    const latency = page.p99_latency;
    const predicted = this.mlService.latestStats()[page.id] ?? page.predicted_sla ?? null;
    const requests = page.total_requests;
    return [
      {
        icon: 'server',
        label: 'SLA',
        value: sla == null ? '—' : `${sla.toFixed(2)}%`,
        sublabel: 'Current service level',
        tone: 'success',
      },
      {
        icon: 'clock',
        label: 'Latency',
        value: latency == null ? '—' : `${latency}ms`,
        sublabel: 'Latest observation',
        tone: 'info',
      },
      {
        icon: 'trending-up',
        label: 'Predicted SLA',
        value: predicted == null ? '—' : `${predicted.toFixed(2)}%`,
        sublabel: '30-day forecast',
        tone: 'default',
      },
      {
        icon: 'bar-chart',
        label: 'Requests',
        value: requests == null ? '—' : `${requests}`,
        sublabel: 'Last 24 hours',
        tone: 'default',
      },
    ];
  };

  dashboardHistory = (
    page: StatusPageData,
    service?: Pick<MonitoredServiceData, 'name' | 'uptime_history'>,
  ): UptimeHistoryDataPoint[] => {
    const source = service?.uptime_history?.length
      ? service.uptime_history
      : (page.uptime_history ?? []);
    return resolveUptimeHistory(source);
  };

  dashboardServices = (page: StatusPageData): StatusDashboardService[] => {
    const services = this.servicesMap()[page.id] ?? [];
    if (services.length === 0 && page.id === this.crawlerPlaceholder.id) {
      return [
        {
          name: 'Primary Site',
          url: 'https://example.com',
          status: 'operational',
          statusLabel: 'Operational',
          latency: `${page.p99_latency ?? 0}ms`,
          uptime: '—',
          history: this.dashboardHistory(page),
        },
        {
          name: 'API Gateway',
          url: 'https://api.example.com',
          status: 'operational',
          statusLabel: 'Operational',
          latency: `${page.p99_latency ?? 0}ms`,
          uptime: '—',
          history: this.dashboardHistory(page, { name: 'API Gateway' }),
        },
      ];
    }

    return services.map(service => ({
      name: this.formatServiceName(service.name),
      url: service.url,
      status: this.statusVariant(service.status),
      statusLabel: service.status || 'Operational',
      latency: `${page.p99_latency ?? 0}ms`,
      uptime: `${this.serviceUptime(page, service).toFixed(2)}%`,
      history: this.dashboardHistory(page, service),
    }));
  };

  dashboardAnnouncements = (page: StatusPageData): StatusDashboardAnnouncement[] => {
    if (this.sanityService.error()) {
      return [
        {
          tone: 'warning',
          title: 'Announcements Unavailable',
          body: this.sanityService.error() ?? 'The announcement feed is temporarily unavailable.',
          publishedAt: page.created_at,
        },
      ];
    }
    if (this.sanityService.loading()) {
      return [
        {
          tone: 'info',
          title: 'System Status Update',
          body: 'Pulling the latest published status updates from the global announcement feed.',
          publishedAt: page.created_at,
        },
      ];
    }

    const announcements = this.sanityService
      .announcements()
      .slice(0, 2)
      .map(ann => ({
        tone: this.announcementTone(ann.severity) === 'warning' ? 'warning' : 'info',
        title: ann.title,
        body: ann.body,
        publishedAt: ann.publishedAt,
      })) satisfies StatusDashboardAnnouncement[];

    const incidents = this.activeIncidents(page.id)
      .slice(0, 2)
      .map(incident => ({
        tone: this.announcementTone(incident.status) === 'warning' ? 'warning' : 'info',
        title: incident.title,
        body: incident.message,
        publishedAt: incident.updated_at || incident.created_at,
      })) satisfies StatusDashboardAnnouncement[];

    // Honest empty: never invent a Sanity demo announcement.
    return [...incidents, ...announcements].slice(0, 2);
  };

  login() {
    void this.router.navigate(['/login'], {
      queryParams: { returnUrl: '/status' },
    });
  }

  private async probeControlPlaneReady(): Promise<void> {
    try {
      const ready = await firstValueFrom(
        this.http
          .get<{
            forjd_health?: string;
            mode?: string;
            status?: string;
          }>(`${environment.backendUrl}/api/v1/ready`)
          .pipe(timeout(2500)),
      );
      this.controlPlaneReady.set(continuityFromReady(ready));
    } catch {
      this.controlPlaneReady.set('unreachable');
    }
  }

  constructor() {
    afterNextRender(() => {
      void this.probeControlPlaneReady();
      this.sanityService.fetchAnnouncements();

      effect(
        () => {
          if (this.authService.isInitialized()) {
            this.loadData();
          }
        },
        { injector: this.injector },
      );
    });
  }

  ngOnInit() {
    this.titleService.setTitle('Service Status Dashboard - DEML APP');
    this.metaService.updateTag({
      name: 'description',
      content:
        'Real-time monitoring, service status checks, and uptime tracking for DEML APP services.',
    });
  }

  loadData() {
    this.loadFailed.set(false);
    const isCrawler = typeof navigator !== 'undefined' && navigator.webdriver;
    if (isCrawler) {
      this.statusPages.set([this.crawlerPlaceholder]);
      this.isLoading.set(false);
      this.loadFailed.set(false);
      return;
    }
    if (this.authService.isAuthenticated()) {
      const applySorted = (data: StatusPageData[]): void => {
        // Include user's own pages AND the platform status page
        const myPages = data.filter(
          p => p.user_id === this.authService.currentUserId() || p.slug === 'platform-status',
        );
        // Sort so platform-status is always first
        const sorted = [...myPages].sort((a, b) => {
          if (a.slug === 'platform-status') return -1;
          if (b.slug === 'platform-status') return 1;
          return a.title.localeCompare(b.title);
        });
        this.statusPages.set(sorted);
        this.monitorService.fetchAllIncidents(sorted);
        this.monitorService.fetchAllServices(sorted);
        for (const page of sorted) {
          this.monitorService.seedFromEmbeddedPage(page);
          this.mlService.seedFromStatusPage(page);
          this.mlService.fetchLatestStat(page.id);
          this.mlService.fetchThreatReport(page.id);
          this.mlService.fetchTemporalForecast(page.id);
        }
        this.isLoading.set(false);
        this.isRetrying.set(false);
      };

      // Optimistic: paint stale status directory, then revalidate.
      const cached = this.monitorService.peekStatusPages();
      if (cached) {
        applySorted(cached);
      } else {
        this.isLoading.set(true);
      }

      this.monitorService
        .getStatusPages()
        .pipe(timeout(15000))
        .subscribe({
          next: data => {
            if (!Array.isArray(data)) {
              if (!cached) {
                this.statusPages.set([]);
                this.loadFailed.set(true);
              }
              this.isLoading.set(false);
              this.isRetrying.set(false);
              return;
            }
            applySorted(data);
          },
          error: err => {
            console.error('Error fetching pages:', err);
            if (!cached) {
              this.statusPages.set([]);
              this.loadFailed.set(true);
            }
            this.isLoading.set(false);
            this.isRetrying.set(false);
          },
        });
    } else {
      this.isLoading.set(false);
      this.isRetrying.set(false);
      void this.router.navigate(['/status/platform-status']);
    }
  }

  isRetrying = signal<boolean>(false);

  retryLoad() {
    this.isRetrying.set(true);
    this.loadData();
  }
}
