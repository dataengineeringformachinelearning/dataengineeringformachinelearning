import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  signal,
  ChangeDetectorRef,
  effect,
  computed,
  afterNextRender,
  Injector,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { MonitorService, StatusPageData } from '../../services/monitor.service';
import { MlService } from '../../services/ml.service';
import { AuthService } from '../../services/auth.service';
import {
  VikingButton,
  VikingExploreCard,
  VikingPageHeader,
} from '@dataengineeringformachinelearning/viking-ui';
import type {
  ExploreCardMetric,
  ExploreCardStatus,
  ExploreCardUptimePoint,
} from '@dataengineeringformachinelearning/viking-ui';
import { VikingAppIcon } from '../../components/viking-app-icon/viking-app-icon';
import { RouterModule } from '@angular/router';
import { StatusCta } from '../../components/status-cta/status-cta';
@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [
    CommonModule,
    VikingButton,
    VikingExploreCard,
    VikingPageHeader,
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
  private cdr = inject(ChangeDetectorRef);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private injector = inject(Injector);

  statusPages = signal<StatusPageData[]>([]);
  loadFailed = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  incidentsMap = this.monitorService.incidentsMap;
  servicesMap = this.monitorService.servicesMap;

  mockPage: StatusPageData = {
    id: 'mock-id',
    title: 'Loading Directory...',
    slug: 'loading',
    description: 'Fetching status pages from the platform directory...',
    created_at: new Date().toISOString(),
    user_id: null,
  };

  displayPages = computed(() => {
    if (this.isLoading() && !this.loadFailed()) {
      return [this.mockPage];
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

  getPageUrl(page: StatusPageData): string {
    return `/status/${page.slug}`;
  }

  cumulativeSla(page: StatusPageData): number {
    return page.cumulative_sla ?? page.overall_uptime ?? 0;
  }

  overallUptime(page: StatusPageData): number {
    return page.overall_uptime ?? page.cumulative_sla ?? 0;
  }

  norseSnnLabel(page: StatusPageData): string {
    const usesNorse = this.mlService.latestTemporalUsesNorse()[page.id];
    if (usesNorse === true) return 'Active';
    if (usesNorse === false) return 'MLP Fallback';
    return 'Pending';
  }

  exploreMetrics(page: StatusPageData): ExploreCardMetric[] {
    const threatReport = this.mlService.latestThreatReports()[page.id];
    const spikeRisk = this.mlService.latestTemporalForecasts()[page.id] ?? 0;
    return [
      {
        icon: 'server',
        label: 'Cumulative SLA',
        value: `${this.cumulativeSla(page).toFixed(2)}%`,
        sublabel: 'Based on real telemetry',
        tone: 'success',
      },
      {
        icon: 'clock',
        label: 'P99 Latency',
        value: `${page.p99_latency ?? 0}ms`,
        sublabel: 'Last 24h',
        tone: 'info',
      },
      {
        icon: 'trending-up',
        label: 'Spike Risk',
        value: spikeRisk.toFixed(2),
        sublabel: 'Dynamic Temporal Forecasting',
        tone: spikeRisk > 65 ? 'warning' : 'default',
      },
      {
        icon: 'shield',
        label: 'Threat Anomaly',
        value: `${((threatReport?.anomaly_score ?? 0) * 100).toFixed(2)}%`,
        sublabel: this.norseSnnLabel(page),
        tone: 'default',
      },
    ];
  }

  exploreUptimeHistory(page: StatusPageData): ExploreCardUptimePoint[] {
    const history = page.uptime_history ?? [];
    if (history.length > 0) {
      return history.map((day, index) => {
        const date = new Date('2026-06-08T00:00:00Z');
        date.setUTCDate(date.getUTCDate() + index);
        const status = `${day.status}`.toLowerCase().replace(/\s+/g, '_');
        return {
          date: date.toISOString().slice(0, 10),
          status:
            status === 'outage' || status === 'major_outage' || status === 'down'
              ? 'down'
              : status === 'degraded' || status === 'partial_outage'
                ? 'partial'
                : 'up',
        };
      });
    }

    return Array.from({ length: 30 }, (_, index) => {
      const date = new Date('2026-06-08T00:00:00Z');
      date.setUTCDate(date.getUTCDate() + index);
      return {
        date: date.toISOString().slice(0, 10),
        status: index === page.title.length % 23 ? 'partial' : 'up',
      };
    });
  }

  constructor() {
    afterNextRender(() => {
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
        this.statusPages.set(publicPages);
        this.monitorService.fetchAllIncidents(publicPages);
        this.monitorService.fetchAllServices(publicPages);

        for (const page of publicPages) {
          this.mlService.fetchLatestStat(page.id);
          this.mlService.fetchThreatReport(page.id);
          this.mlService.fetchTemporalForecast(page.id);
        }

        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.statusPages.set([]);
        this.loadFailed.set(true);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  isRetrying = signal<boolean>(false);

  retryLoad() {
    this.isRetrying.set(true);
    window.location.reload();
  }
}
