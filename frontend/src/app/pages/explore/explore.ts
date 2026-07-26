import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  signal,
  effect,
  untracked,
} from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { MonitorService, StatusPageData } from '../../services/monitor.service';
import { MlService } from '../../services/ml.service';
import { AuthService } from '../../services/auth.service';
import {
  VikingButton,
  VikingCallout,
  VikingExploreCard,
  VikingPageHeader,
  VikingPageSkeleton,
  VikingPageTemplate,
} from '@dataengineeringformachinelearning/viking-ui';
import type {
  ExploreCardMetric,
  ExploreCardStatus,
  ExploreCardUptimePoint,
} from '@dataengineeringformachinelearning/viking-ui';
import { RouterModule } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { StatusCta } from '../../components/status-cta/status-cta';
import { toUptimeHistoryDataPoints } from '../../core/utils/uptime.utils';
import {
  formatTemporalScore,
  temporalEngineLabel,
  temporalRiskLabel,
} from '../../core/utils/temporal.utils';
import { ConnectivityService } from '../../services/connectivity.service';
import {
  OFFLINE_BODY,
  OFFLINE_HEADING,
  STATUS_CONNECT_BODY,
  STATUS_CONNECT_HEADING,
  STATUS_RETRY_LABEL,
} from '../../core/continuity-copy';
@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [
    VikingButton,
    VikingCallout,
    VikingExploreCard,
    VikingPageHeader,
    VikingPageSkeleton,
    VikingPageTemplate,
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
  readonly connectivity = inject(ConnectivityService);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private hasLoaded = false;

  readonly connectHeading = STATUS_CONNECT_HEADING;
  readonly connectBody = STATUS_CONNECT_BODY;
  readonly offlineHeading = OFFLINE_HEADING;
  readonly offlineBody = OFFLINE_BODY;
  readonly retryLabel = STATUS_RETRY_LABEL;

  statusPages = signal<StatusPageData[]>([]);
  loadFailed = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  incidentsMap = this.monitorService.incidentsMap;
  servicesMap = this.monitorService.servicesMap;

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

  exploreMetrics(page: StatusPageData): ExploreCardMetric[] {
    const threatReport = this.mlService.latestThreatReports()[page.id];
    const temporal = this.mlService.latestTemporalInsights()[page.id];
    const spikeRisk = temporal?.forecast;
    const riskLabel = temporalRiskLabel(temporal);
    const engineLabel = temporalEngineLabel(temporal);
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
        value: formatTemporalScore(temporal),
        sublabel: riskLabel === engineLabel ? riskLabel : `${riskLabel} · ${engineLabel}`,
        tone: spikeRisk != null && spikeRisk > 65 ? 'warning' : 'default',
      },
      {
        icon: 'shield',
        label: 'Threat Anomaly',
        value: anomaly == null ? '—' : `${(anomaly * 100).toFixed(2)}%`,
        sublabel: 'Model-scored telemetry',
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
    this.loadFailed.set(false);
    // Optimistic: paint stale directory immediately, then revalidate + hydrate KPIs.
    const cached = this.monitorService.peekStatusPages();
    if (cached) {
      this.applyDirectory(cached.filter(p => p.is_published || p.slug === 'platform-status'));
    } else {
      this.isLoading.set(true);
    }

    this.monitorService
      .getStatusPages()
      .pipe(timeout(15000))
      .subscribe({
        next: data => {
          // Under /explore we show all public status pages, including the main 'platform-status' system page
          if (!Array.isArray(data)) {
            if (!cached) {
              this.statusPages.set([]);
              this.loadFailed.set(true);
            }
            this.isLoading.set(false);
            this.isRetrying.set(false);
            return;
          }
          const publicPages = data.filter(p => p.is_published || p.slug === 'platform-status');
          this.applyDirectory(publicPages);
          this.hydrateDirectoryCards(publicPages);
        },
        error: () => {
          if (!cached) {
            this.statusPages.set([]);
            this.loadFailed.set(true);
          }
          this.isLoading.set(false);
          this.isRetrying.set(false);
        },
      });
  }

  private applyDirectory(pages: StatusPageData[]): void {
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
    this.isRetrying.set(false);
  }

  /** Background slug hydrations — never block the directory first paint. */
  private hydrateDirectoryCards(publicPages: StatusPageData[]): void {
    for (const page of publicPages) {
      this.monitorService
        .getStatusPageBySlug(page.slug)
        .pipe(
          map(hydrated => ({ ...page, ...hydrated, id: hydrated.id || page.id })),
          catchError(() => {
            console.warn('[explore] status page hydrate failed slug=%s', page.slug);
            return of(page);
          }),
        )
        .subscribe(hydrated => {
          this.statusPages.update(current =>
            current.map(item => (item.slug === hydrated.slug ? hydrated : item)),
          );
          this.monitorService.seedFromEmbeddedPage(hydrated);
          this.mlService.seedFromStatusPage(hydrated);
        });
    }
  }

  isRetrying = signal<boolean>(false);

  retryLoad() {
    this.isRetrying.set(true);
    this.loadData();
  }
}
