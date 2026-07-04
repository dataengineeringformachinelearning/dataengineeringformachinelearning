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
  VikingButton,
  VikingUptimeBar,
  VikingUptimeStatus,
} from '@dataengineeringformachinelearning/viking-ui';
import { VikingAppIcon } from '../../components/viking-app-icon/viking-app-icon';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { formatServiceName } from '../../core/utils/formatter.utils';
import { SanityService } from '../../services/sanity.service';
import { ProVerifiedBadge } from '../../components/pro-verified-badge/pro-verified-badge';

import { timeout } from 'rxjs';

@Component({
  selector: 'app-isolated-status',
  standalone: true,
  imports: [
    CommonModule,
    VikingButton,
    VikingUptimeBar,
    VikingAppIcon,
    RouterModule,
    ProVerifiedBadge,
  ],
  templateUrl: './isolated-status.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './isolated-status.scss',
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

  isRetrying = signal<boolean>(false);

  getPageStatusClass(pageId: string): string {
    const status = this.getPageStatus(pageId);
    if (status === 'Operational') return 'operational';
    return status.toLowerCase();
  }

  retryLoad() {
    this.isRetrying.set(true);
    window.location.reload();
  }

  protected uptimeBarStatus(status: string): VikingUptimeStatus {
    if (
      status === 'operational' ||
      status === 'partial_outage' ||
      status === 'major_outage' ||
      status === 'no_data'
    ) {
      return status;
    }
    return 'operational';
  }
}
