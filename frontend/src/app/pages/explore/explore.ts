import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  signal,
  effect,
  computed,
  untracked,
} from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { MonitorService, StatusPageData } from '../../services/monitor.service';
import { MlService } from '../../services/ml.service';
import { AuthService } from '../../services/auth.service';
import {
  VikingButton,
  VikingExploreCard,
  VikingPageHeader,
  VikingPageTemplate,
} from '@dataengineeringformachinelearning/viking-ui';
import type {
  ExploreCardMetric,
  ExploreCardStatus,
  ExploreCardUptimePoint,
} from '@dataengineeringformachinelearning/viking-ui';
import { VikingAppIcon } from '../../components/viking-app-icon/viking-app-icon';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { StatusCta } from '../../components/status-cta/status-cta';
import { toUptimeHistoryDataPoints } from '../../core/utils/uptime.utils';
@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [
    VikingButton,
    VikingExploreCard,
    VikingPageHeader,
    VikingPageTemplate,
    VikingAppIcon,
    RouterModule,
    StatusCta,
  ],
  templateUrl: './explore.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Explore implements OnInit {
  private monitorService = inject(MonitorService);
  public mlService = inject(MlService);
  public authService = inject(AuthService);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private hasLoaded = false;

  statusPages = signal<StatusPageData[]>([]);
  loadFailed = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  incidentsMap = this.monitorService.incidentsMap;
  servicesMap = this.monitorService.servicesMap;

  /** Skeleton card shown while the published directory loads. */
  loadingPlaceholder: StatusPageData = {
    id: 'loading-placeholder',
    title: 'Loading Directory...',
    slug: 'loading',
    description: 'Fetching status pages from the platform directory...',
    created_at: new Date().toISOString(),
    user_id: null,
  };

  displayPages = computed(() => {
    if (this.isLoading() && !this.loadFailed()) {
      return [this.loadingPlaceholder];
    }
    return this.statusPages();
  });

  getPageStatus(page: StatusPageData): ExploreCardStatus {
    const active = (this.incidentsMap()[page.id] || []).filter(
      incident => incident.status !== 'Resolved',
    );
    if (active.length > 0) {
      return active[0].status;
    }
    const services = this.servicesMap()[page.id] || [];
    const normalized = (status?: string | null) =>
      (status || 'operational').toLowerCase().replace(/[\s-]+/g, '_');
    if (
      services.some(service => {
        const value = normalized(service.status);
        return value === 'outage' || value === 'major_outage' || value === 'down';
      })
    ) {
      return 'Outage';
    }
    if (
      services.some(service => {
        const value = normalized(service.status);
        return value === 'degraded' || value === 'partial_outage' || value === 'partial';
      })
    ) {
      return 'Degraded';
    }
    if (services.some(service => normalized(service.status) === 'maintenance')) {
      return 'Maintenance';
    }
    return 'operational';
  }

  getPageStatusLabel(page: StatusPageData): string {
    const status = `${this.getPageStatus(page)}`.toLowerCase();
    if (status === 'operational' || status === 'up') return 'Operational';
    if (status === 'degraded' || status === 'partial outage') return 'Degraded';
    if (status === 'maintenance') return 'Maintenance';
    if (status === 'outage' || status === 'major outage' || status === 'down') return 'Outage';
    return `${this.getPageStatus(page)}`;
  }

  /** Uptime header copy — avoid repeating the status badge label. */
  uptimeSummary(page: StatusPageData): string {
    const label = this.getPageStatusLabel(page);
    if (label === 'Operational') return 'No current issues';
    return label;
  }

  getPageUrl(page: StatusPageData): string {
    return `/status/${page.slug}`;
  }

  cumulativeSla(page: StatusPageData): number | null {
    return page.cumulative_sla ?? page.overall_uptime ?? null;
  }

  overallUptime(page: StatusPageData): number | null {
    return page.overall_uptime ?? page.cumulative_sla ?? null;
  }

  norseSnnLabel(page: StatusPageData): string {
    const usesNorse = this.mlService.latestTemporalUsesNorse()[page.id];
    if (usesNorse === true) return 'Active';
    if (usesNorse === false) return 'MLP Fallback';
    return 'Pending';
  }

  exploreMetrics(page: StatusPageData): ExploreCardMetric[] {
    const threatReport = this.mlService.latestThreatReports()[page.id];
    const spikeRisk = this.mlService.latestTemporalForecasts()[page.id];
    const sla = this.cumulativeSla(page);
    const latency = page.p99_latency;
    const anomaly = threatReport?.anomaly_score;
    return [
      {
        icon: 'server',
        label: 'Cumulative SLA',
        value: sla == null ? '—' : `${sla.toFixed(2)}%`,
        sublabel: 'Based on real telemetry',
        tone: 'success',
      },
      {
        icon: 'clock',
        label: 'P99 Latency',
        value: latency == null ? '—' : `${latency}ms`,
        sublabel: 'Last 24h',
        tone: 'info',
      },
      {
        icon: 'trending-up',
        label: 'Spike Risk',
        value: spikeRisk == null ? '—' : spikeRisk.toFixed(2),
        sublabel: 'Dynamic Temporal Forecasting',
        tone: spikeRisk != null && spikeRisk > 65 ? 'warning' : 'default',
      },
      {
        icon: 'shield',
        label: 'Threat Anomaly',
        value: anomaly == null ? '—' : `${(anomaly * 100).toFixed(2)}%`,
        sublabel: this.norseSnnLabel(page),
        tone: 'default',
      },
    ];
  }

  exploreUptimeHistory(page: StatusPageData): ExploreCardUptimePoint[] {
    const history = page.uptime_history ?? [];
    if (history.length > 0) {
      return toUptimeHistoryDataPoints(history);
    }
    // Never invent uptime history — empty means "no projection yet".
    return [];
  }

  constructor() {
    effect(() => {
      if (this.hasLoaded || !this.authService.isInitialized()) return;
      this.hasLoaded = true;
      untracked(() => this.loadData());
    });
  }

  ngOnInit() {
    this.titleService.setTitle('Explore Public Status Pages - DEML APP');
    this.metaService.updateTag({
      name: 'description',
      content:
        'Browse community-published public service status pages and active system uptime monitors.',
    });
  }

  loadData() {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.monitorService.getStatusPages().subscribe({
      next: data => {
        // Under /explore we show all public status pages, including the main 'platform-status' system page
        if (!Array.isArray(data)) return;
        const publicPages = data.filter(p => p.is_published || p.slug === 'platform-status');
        // Directory list may omit KPIs — hydrate each card from the public slug DTO.
        const hydrations = publicPages.map(page =>
          this.monitorService.getStatusPageBySlug(page.slug).pipe(
            map(hydrated => ({ ...page, ...hydrated, id: hydrated.id || page.id })),
            catchError(() => of(page)),
          ),
        );
        const applyPages = (pages: StatusPageData[]) => {
          this.statusPages.set(pages);
          for (const page of pages) {
            this.monitorService.seedFromEmbeddedPage(page);
            this.mlService.seedFromStatusPage(page);
            if (this.authService.isAuthenticated()) {
              this.mlService.fetchLatestStat(page.id);
              this.mlService.fetchThreatReport(page.id);
              this.mlService.fetchTemporalForecast(page.id);
            }
          }
          if (this.authService.isAuthenticated()) {
            this.monitorService.fetchAllIncidents(pages);
            this.monitorService.fetchAllServices(pages);
          }
          this.isLoading.set(false);
        };
        if (hydrations.length === 0) {
          applyPages([]);
          return;
        }
        forkJoin(hydrations).subscribe({
          next: applyPages,
          error: () => applyPages(publicPages),
        });
      },
      error: () => {
        this.statusPages.set([]);
        this.loadFailed.set(true);
        this.isLoading.set(false);
      },
    });
  }

  isRetrying = signal<boolean>(false);

  retryLoad() {
    this.isRetrying.set(true);
    window.location.reload();
  }
}
