import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  signal,
  ChangeDetectorRef,
  computed,
  effect,
  afterNextRender,
  Injector,
  runInInjectionContext,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { MonitorService, StatusPageData } from '../../services/monitor.service';
import { MlService, ThreatReportResponse } from '../../services/ml.service';
import { AuthService } from '../../services/auth.service';
import {
  AnnouncementCardComponent,
  VikingButton,
  VikingCallout,
  VikingChart,
  VikingChartPanel,
  VikingMetricCard,
  VikingPageHeader,
  VikingStatusBadge,
  VikingStatusSection,
  VikingUptimeHistory,
} from '@dataengineeringformachinelearning/viking-ui';
import type { VikingChartSeries, VikingTone } from '@dataengineeringformachinelearning/viking-ui';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { formatServiceName } from '../../core/utils/formatter.utils';
import { SanityService } from '../../services/sanity.service';
import { StatusCta } from '../../components/status-cta/status-cta';

import { timeout } from 'rxjs';

@Component({
  selector: 'app-isolated-status',
  standalone: true,
  imports: [
    CommonModule,
    AnnouncementCardComponent,
    VikingButton,
    VikingCallout,
    VikingChart,
    VikingChartPanel,
    VikingMetricCard,
    VikingPageHeader,
    VikingStatusBadge,
    VikingStatusSection,
    VikingUptimeHistory,
    RouterModule,
    StatusCta,
  ],
  templateUrl: './isolated-status.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IsolatedStatus implements OnInit {
  private monitorService = inject(MonitorService);
  public mlService = inject(MlService);
  public authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  public sanityService = inject(SanityService);
  private injector = inject(Injector);

  formatServiceName = formatServiceName;
  statusPages = signal<StatusPageData[]>([]);
  loadFailed = signal<boolean>(false);
  loadErrorKind = signal<'network' | 'not_found' | 'forbidden' | null>(null);
  isLoading = signal<boolean>(true);
  incidentsMap = this.monitorService.incidentsMap;
  servicesMap = this.monitorService.servicesMap;

  p99LatencyMap = signal<Record<string, number>>({ 'mock-id': 0 });
  totalRequestsMap = signal<Record<string, number>>({ 'mock-id': 0 });
  simulatedThreatReportMap = signal<Record<string, ThreatReportResponse>>({
    'mock-id': {
      status: 'success',
      suspicious_ratio: 0,
      anomaly_score: 0,
      top_location: 'N/A',
      location_weight: 0,
      created_at: null,
      message: 'Pending telemetry',
    },
  });

  mockPage: StatusPageData = {
    id: 'mock-id',
    title: 'Platform Status Feed',
    slug: 'platform-status',
    description: 'Real-time telemetry and status monitoring for all machine learning pipelines.',
    created_at: new Date().toISOString(),
    user_id: null,
  };

  displayPages = computed(() => {
    if (this.isLoading() && !this.loadFailed()) {
      return [this.mockPage];
    }
    return this.statusPages();
  });

  globalPageStatus = computed(() => {
    const pages = this.statusPages();
    if (pages.length === 0) return 'Operational';
    const pageId = pages[0].id;

    const incs = this.incidentsMap()[pageId] || [];
    const activeIncidents = incs.filter(i => i.status !== 'Resolved');

    const services = this.servicesMap()[pageId] || [];
    const httpServices = services.filter(s => s.name !== 'Event Projections');
    const outages = httpServices.filter(s => s.status === 'Outage');
    const degraded = services.filter(s => s.status === 'Degraded');

    if (activeIncidents.length > 0 || outages.length > 0) {
      return 'Outage';
    } else if (degraded.length > 0) {
      return 'Degraded';
    }
    return 'Operational';
  });

  threatReportsByPage = computed(() => {
    const reports = this.mlService.latestThreatReports();
    const simulated = this.simulatedThreatReportMap();
    const result: Record<string, ThreatReportResponse> = {};
    for (const page of this.statusPages()) {
      result[page.id] = reports[page.id] || simulated[page.id];
    }
    return result;
  });

  login() {
    this.router.navigate(['/login']);
  }

  slug = signal<string | null>(null);

  constructor() {
    afterNextRender(() => {
      this.sanityService.fetchAnnouncements();

      effect(
        () => {
          const currentSlug = this.slug();
          const isAuthInit = this.authService.isInitialized();
          if (currentSlug && isAuthInit) {
            this.loadPage(currentSlug);
          }
        },
        { injector: this.injector },
      );
    });
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug');
      this.slug.set(slug);
    });
  }

  loadPage(slug: string) {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    const isCrawler = typeof navigator !== 'undefined' && navigator.webdriver;
    if (isCrawler) {
      this.statusPages.set([this.mockPage]);
      this.isLoading.set(false);
      this.loadFailed.set(false);
      this.cdr.markForCheck();
      return;
    }
    this.monitorService
      .getStatusPageBySlug(slug)
      .pipe(timeout(15000))
      .subscribe({
        next: page => {
          this.statusPages.set([page]);
          this.p99LatencyMap.update(m => ({ ...m, [page.id]: page.p99_latency ?? 0 }));
          this.totalRequestsMap.update(m => ({ ...m, [page.id]: page.total_requests ?? 0 }));
          this.simulatedThreatReportMap.update(m => ({
            ...m,
            [page.id]: {
              status: 'success',
              suspicious_ratio: 0,
              anomaly_score: 0,
              top_location: 'N/A',
              location_weight: 0,
              created_at: null,
              message: 'Pending telemetry',
            },
          }));

          this.monitorService.fetchAllIncidents([page]);
          this.monitorService.fetchAllServices([page]);
          runInInjectionContext(this.injector, () => {
            this.mlService.fetchLatestStat(page.id);
            this.mlService.fetchThreatReport(page.id);
            this.mlService.fetchTemporalForecast(page.id);
          });

          this.titleService.setTitle(`${page.title} Status - DEML APP`);
          this.metaService.updateTag({
            name: 'description',
            content: `Operational status, real-time alerts, and historical uptime details for the ${page.title} service status page.`,
          });

          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
        error: err => {
          if (err instanceof HttpErrorResponse) {
            if (err.status === 404) {
              this.loadErrorKind.set('not_found');
            } else if (err.status === 403) {
              this.loadErrorKind.set('forbidden');
            } else {
              this.loadErrorKind.set('network');
            }
          } else {
            this.loadErrorKind.set('network');
          }
          this.statusPages.set([]);
          this.loadFailed.set(true);
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
      });
  }

  getPageStatus(pageId: string): string {
    const incs = this.incidentsMap()[pageId] || [];
    const active = incs.filter(i => i.status !== 'Resolved');
    if (active.length > 0) {
      return active[0].status;
    }
    return 'Operational';
  }

  getThreatReport(pageId: string) {
    return this.threatReportsByPage()[pageId];
  }

  statusUpdatedAt = (page: StatusPageData): string =>
    this.incidentsMap()[page.id]?.[0]?.updated_at ?? page.created_at;

  norseSnnLabel(pageId: string): string {
    const usesNorse = this.mlService.latestTemporalUsesNorse()[pageId];
    if (usesNorse === true) return 'Active';
    if (usesNorse === false) return 'MLP Fallback';
    return 'Pending';
  }

  availabilitySeries(page: StatusPageData): VikingChartSeries[] {
    const history = page.uptime_history ?? [];
    const values = history
      .filter(day => day.status !== 'no_data' && day.uptime !== null)
      .map(day => day.uptime as number);
    if (values.length === 0) {
      return [{ name: 'Availability', tone: 'accent', data: [] }];
    }
    return [{ name: 'Availability', tone: 'accent', data: values }];
  }

  protected statusVariant(
    status?: string | null,
  ): 'operational' | 'degraded' | 'outage' | 'maintenance' {
    const value = (status || 'Operational').toLowerCase();
    if (value === 'outage' || value === 'major outage' || value === 'down') return 'outage';
    if (value === 'degraded' || value === 'partial outage') return 'degraded';
    if (value === 'maintenance') return 'maintenance';
    return 'operational';
  }

  protected statusDescription(status: string): string {
    if (status === 'Operational') return 'All systems are functioning normally.';
    if (status === 'Degraded') return 'Some services are experiencing degraded performance.';
    if (status === 'Maintenance') return 'Planned maintenance is currently in progress.';
    return 'Some services are currently experiencing downtime.';
  }

  protected serviceUptime(page: StatusPageData, service: { sla?: number | null }): number {
    return service.sla ?? page.overall_uptime ?? page.cumulative_sla ?? 100;
  }

  protected announcementTone(severity?: string | null): 'accent' | 'warning' | 'danger' | 'muted' {
    const key = (severity || 'info').toLowerCase();
    if (key === 'critical' || key === 'error' || key === 'danger') return 'danger';
    if (key === 'warning') return 'warning';
    if (key === 'info' || key === 'primary') return 'accent';
    return 'muted';
  }

  protected globalStatusTone(status: string): VikingTone {
    if (status === 'Outage') return 'danger';
    if (status === 'Degraded') return 'warning';
    return 'success';
  }

  protected serviceStatusTone(status?: string | null): VikingTone {
    const value = (status || 'Operational').toLowerCase();
    if (value === 'outage' || value === 'major outage') return 'danger';
    if (value === 'degraded') return 'warning';
    if (value === 'operational') return 'success';
    return 'muted';
  }

  protected incidentTone(status?: string | null): VikingTone {
    const value = (status || '').toLowerCase();
    if (value === 'resolved') return 'success';
    if (value === 'investigating' || value === 'maintenance') return 'warning';
    return 'danger';
  }

  isRetrying = signal<boolean>(false);

  retryLoad() {
    this.isRetrying.set(true);
    window.location.reload();
  }
}
