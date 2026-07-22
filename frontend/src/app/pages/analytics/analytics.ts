import {
  Component,
  inject,
  effect,
  signal,
  computed,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  PLATFORM_ID,
  OnDestroy,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import {
  VikingChart,
  VikingBadge,
  VikingButton,
  VikingCallout,
  VikingChartSeries,
  VikingField,
  VikingFormGrid,
  VikingFormSection,
  VikingGaugeArc,
  VikingInput,
  VikingPageHeader,
  VikingPageTemplate,
  VikingGridItem,
  VikingPanelGrid,
  VikingContainer,
  VikingCard,
  VikingMetricCard,
  VikingSection,
  VikingStack,
  VikingChartPanel,
  VikingChartCardHeader,
  VikingChartEmptyState,
  VikingSectionTemplate,
} from '@dataengineeringformachinelearning/viking-ui';
import { Subscription } from 'rxjs';
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { LiveUpdatesService } from '../../services/live-updates.service';
import {
  UnifiedSelect,
  SelectOption,
} from '../../components/unified-select/unified-select.component';
import { VikingAppIcon } from '../../components/viking-app-icon/viking-app-icon';
import {
  VikingDonutSegment,
  hasChartValues,
  hasDonutValues,
  toVikingBarSeries,
  toVikingDonutSegments,
  toVikingLineSeries,
  toVikingStackedStatusSeries,
} from '../../core/chart-data.util';
import { environment } from '../../../environments/environment';
import { API_ENDPOINTS } from '../../core/constants/api.constants';
import * as L from 'leaflet';

export type ExportJobRow = {
  id: string;
  kind: string;
  format: string;
  status: string;
  byte_size: number;
  content_type: string;
  error: string;
  attempts: number;
  next_attempt_at?: string | null;
  retrying: boolean;
  created_at: string;
  completed_at?: string | null;
  expires_at?: string | null;
  download_ready: boolean;
};

export type ExportRequestPayload = {
  kind: string;
  format: string;
  days: number;
  site_url?: string;
};

export const isExportPending = (job: ExportJobRow): boolean =>
  job.status === 'queued' || job.status === 'running' || job.retrying === true;

export type ExportActionPresentation = {
  label: 'Download' | 'Processing' | 'Unavailable' | 'Pending';
  variant: 'primary' | 'ghost';
  loading: boolean;
  disabled: boolean;
};

export const getExportActionPresentation = (job: ExportJobRow): ExportActionPresentation => {
  if (job.download_ready) {
    return {
      label: 'Download',
      variant: 'primary',
      loading: false,
      disabled: false,
    };
  }

  if (isExportPending(job)) {
    return {
      label: 'Processing',
      variant: 'ghost',
      loading: true,
      disabled: true,
    };
  }

  return {
    label: job.error ? 'Unavailable' : 'Pending',
    variant: 'ghost',
    loading: false,
    disabled: true,
  };
};

export const buildExportRequestPayload = (
  kind: string,
  format: string,
  days: number,
  selectedSite: string | null,
): ExportRequestPayload => {
  const payload: ExportRequestPayload = { kind, format, days };
  const supportsSite = kind === 'analytics' || kind === 'lighthouse';
  if (supportsSite && selectedSite && selectedSite !== 'All') {
    payload.site_url = selectedSite;
  }
  return payload;
};

type BenchmarkSummary = {
  model_type: string;
  mae: number;
  rmse: number;
  accuracy_percent: number | null;
  dataset_size: number;
  evaluation_status: 'measured' | 'insufficient_data';
  created_at: string;
};

type BenchmarkRollup = {
  score_percent: number | null;
  accuracy_percent: number | null;
  mae: number | null;
  rmse: number | null;
  dataset_size: number;
  models_evaluated: number;
  measured_models: number;
  evaluation_status: 'measured' | 'insufficient_data';
  created_at: string | null;
};

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UnifiedSelect,
    VikingChart,
    VikingBadge,
    VikingButton,
    VikingCallout,
    VikingField,
    VikingFormGrid,
    VikingFormSection,
    VikingInput,
    VikingGaugeArc,
    VikingAppIcon,
    VikingPageHeader,
    VikingPageTemplate,
    VikingGridItem,
    VikingPanelGrid,
    VikingContainer,
    VikingCard,
    VikingMetricCard,
    VikingSection,
    VikingStack,
    VikingChartPanel,
    VikingChartCardHeader,
    VikingChartEmptyState,
    VikingSectionTemplate,
  ],
  templateUrl: './analytics.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsComponent implements OnDestroy {
  public readonly getExportActionPresentation = getExportActionPresentation;
  private http = inject(HttpClient);
  private themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private liveUpdates = inject(LiveUpdatesService);
  private analyticsBootstrapped = false;

  public p99Latency = 0;
  public uptimePercent: number | null = 0;
  public totalRequests = 0;
  public activeIncidents = 0;
  public widgetInteractions = 0;
  public uniqueVisitors = 0;
  public cookieConsents = 0;
  public activeProviders: string[] = [];
  public isLoading = true;
  metricsDegraded = signal(false);
  loadError = signal<string | null>(null);

  public apiUsageCurrent = 0;
  public apiUsageQuota = 60;

  public latencyTrend = '';
  public originTrend = '';
  public frequencyTrend = '';
  public endpointTrend = '';
  public statusTrend = '';
  public threatTrend = '';
  public anomalyTrend = '';

  public tenants: any[] = [];
  public selectedTenantId: string | null = null;
  public availableSites: string[] = [];
  public siteOptions: SelectOption[] = [{ value: 'All', label: 'All Sites' }];
  public selectedSite: string | null = null;

  public cesLevel = 0;
  public threatLevel = 0;
  public slaLevel = 0;
  public stabilityLevel = 0;
  public temporalForecast = 0;
  public honeypotScore = 0;
  public latestBenchmarkScore: number | null = null;
  public latestBenchmark: BenchmarkSummary | null = null;
  public benchmarkSummary: BenchmarkRollup | null = null;
  public platformBenchmarkSummary: BenchmarkRollup | null = null;

  latencySeries = signal<VikingChartSeries[]>(toVikingLineSeries('Latency (ms)', []));
  frequencySeries = signal<VikingChartSeries[]>(toVikingLineSeries('Requests', [], 'muted'));
  statusSeries = signal<VikingChartSeries[]>(toVikingBarSeries('Count', []));
  statusStackedSeries = signal<VikingChartSeries[]>([]);
  endpointSeries = signal<VikingChartSeries[]>(toVikingBarSeries('Calls', []));
  topRegionsSeries = signal<VikingChartSeries[]>(toVikingBarSeries('Requests', [], 'warning'));
  threatSeveritySegments = signal<VikingDonutSegment[]>([]);
  securityAlertsSeries = signal<VikingChartSeries[]>(toVikingBarSeries('Anomalies', [], 'warning'));

  latencyCategories = signal<string[]>([]);
  frequencyCategories = signal<string[]>([]);
  statusCategories = signal<string[]>([]);
  endpointCategories = signal<string[]>([]);
  topRegionsCategories = signal<string[]>([]);
  securityAlertCategories = signal<string[]>([]);

  hasLatencyData = computed(() =>
    hasChartValues(this.latencySeries().flatMap(series => series.data)),
  );
  hasFrequencyData = computed(() =>
    hasChartValues(this.frequencySeries().flatMap(series => series.data)),
  );
  hasStatusData = computed(() =>
    hasChartValues(this.statusSeries().flatMap(series => series.data)),
  );
  hasStatusStackedData = computed(() =>
    hasChartValues(this.statusStackedSeries().flatMap(series => series.data)),
  );
  hasEndpointData = computed(() =>
    hasChartValues(this.endpointSeries().flatMap(series => series.data)),
  );
  hasTopRegionsData = computed(() =>
    hasChartValues(this.topRegionsSeries().flatMap(series => series.data)),
  );
  hasThreatSeverityData = computed(() => hasDonutValues(this.threatSeveritySegments()));
  hasSecurityAlertsData = computed(() =>
    hasChartValues(this.securityAlertsSeries().flatMap(series => series.data)),
  );

  public originMapData: any[] = [];
  public map: L.Map | undefined;
  private intervalId: ReturnType<typeof setInterval> | undefined;
  private exportPollId: ReturnType<typeof setInterval> | undefined;
  private liveRefreshTimer: ReturnType<typeof setTimeout> | undefined;
  private liveSub: Subscription | undefined;
  private readonly onVisibilityChange = (): void => {
    if (document.hidden) {
      this.stopAnalyticsPolling();
      return;
    }

    this.loadAnalyticsData();
    this.startAnalyticsPolling();
  };

  public tenantOptions: SelectOption[] = [];

  public exportKind = 'analytics';
  public exportFormat = 'csv';
  public exportDays = 7;
  public exportBusy = false;
  public exportMessage = '';
  public exportDeletingId: string | null = null;
  public exportsList: ExportJobRow[] = [];
  private exportIdempotencyKey: string | null = null;
  private exportRequestFingerprint = '';

  public readonly exportKindOptions: SelectOption[] = [
    { value: 'analytics', label: 'Analytics' },
    { value: 'threat', label: 'Threat intel' },
    { value: 'lighthouse', label: 'Lighthouse' },
    { value: 'vulnerabilities', label: 'Vulnerabilities' },
  ];
  public readonly exportFormatOptions: SelectOption[] = [
    { value: 'csv', label: 'CSV' },
    { value: 'json', label: 'JSON' },
    { value: 'parquet', label: 'Parquet' },
    { value: 'pdf', label: 'PDF' },
  ];

  get exportDaysLabel(): string {
    return String(this.exportDays);
  }

  public onExportDaysChange(value: string): void {
    const n = Number.parseInt(value, 10);
    this.exportDays = Number.isFinite(n) ? Math.min(90, Math.max(1, n)) : 7;
  }

  get isDarkMode(): boolean {
    return this.themeService.theme() === 'dark';
  }

  constructor() {
    effect(() => {
      this.themeService.theme();
      this.updateMapTheme();
    });

    // Wait for Firebase session restore so overview/export GETs include Bearer auth.
    effect(() => {
      if (!this.isBrowser || this.analyticsBootstrapped || !this.authService.isInitialized()) {
        return;
      }
      this.analyticsBootstrapped = true;
      this.loadTenants();
      this.loadExports();
      document.addEventListener('visibilitychange', this.onVisibilityChange);
      this.startAnalyticsPolling();
      this.liveSub = this.liveUpdates.updates$.subscribe(evt => {
        if (evt.type === 'projections') this.scheduleLiveRefresh();
      });
      this.liveUpdates.start();
    });
  }

  private updateMapTheme() {
    if (this.map) {
      this.map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) {
          this.map?.removeLayer(layer);
        }
      });
      const tileUrl = this.isDarkMode
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
      L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(this.map);

      setTimeout(() => {
        this.map?.invalidateSize();
      }, 100);
    }
  }

  public getGaugeStroke(value: number, circumference: number): string {
    const dash = (value / 100) * circumference;
    return `${dash} ${circumference}`;
  }

  private loadAnalyticsData() {
    this.isLoading = true;
    this.loadError.set(null);
    let url = `${environment.backendUrl}/api/v1/analytics/overview`;
    const params = [];
    if (this.selectedTenantId) {
      params.push(`tenant_id=${this.selectedTenantId}`);
    }
    if (this.selectedSite && this.selectedSite !== 'All') {
      params.push(`site_url=${encodeURIComponent(this.selectedSite)}`);
    }
    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    this.http.get<any>(url).subscribe({
      next: response => {
        if (response.status === 'success' && response.data) {
          const { benchmarking, ces, user_metrics } = response.data;
          const degraded =
            response?.degraded === true ||
            response?.code === 'forjd_read_fallback' ||
            response?.code === 'forjd_degraded' ||
            user_metrics?.data_available === false;
          this.metricsDegraded.set(degraded);
          this.loadError.set(
            degraded
              ? 'Analytics is running in fallback mode. Live FORJD rollups are unavailable.'
              : null,
          );

          if (user_metrics?.available_sites) {
            this.availableSites = user_metrics.available_sites;
            this.siteOptions = [
              { value: 'All', label: 'All Sites' },
              ...this.availableSites.map(site => ({ value: site, label: site })),
            ];
          }

          this.cesLevel = degraded ? 0 : (ces?.level ?? 0);
          this.threatLevel = degraded ? 0 : (ces?.threat ?? 0);
          this.slaLevel = degraded ? 0 : (ces?.sla ?? 0);
          this.stabilityLevel = degraded ? 0 : (ces?.stability ?? 0);
          this.temporalForecast = degraded
            ? 0
            : (response.data?.spiking_temporal_forecast ?? ces?.spiking_temporal_forecast ?? 0);
          this.honeypotScore = degraded ? 0 : (response.data?.honeypot_score ?? 0);
          this.latestBenchmarkScore = degraded ? null : (ces?.latest_benchmark_score ?? null);
          this.latestBenchmark = degraded ? null : (ces?.latest_benchmark ?? null);
          this.benchmarkSummary = degraded ? null : (benchmarking?.current_scope ?? null);
          this.platformBenchmarkSummary = degraded
            ? null
            : (benchmarking?.platform_reference ?? null);

          this.p99Latency = degraded ? 0 : (user_metrics?.p99_latency_ms ?? 0);
          this.uptimePercent = degraded ? null : (user_metrics?.uptime_percent ?? null);
          this.totalRequests = degraded ? 0 : (user_metrics?.total_requests_24h ?? 0);
          this.activeIncidents = degraded ? 0 : (user_metrics?.active_incidents ?? 0);

          this.widgetInteractions = degraded ? 0 : user_metrics?.widget_interactions || 0;
          this.uniqueVisitors = degraded ? 0 : user_metrics?.unique_visitors || 0;
          this.cookieConsents = degraded
            ? 0
            : (user_metrics?.cookie_consents?.analytical || 0) +
              (user_metrics?.cookie_consents?.marketing || 0);
          this.activeProviders = degraded ? [] : user_metrics?.active_providers || [];

          if (!degraded && user_metrics?.api_usage) {
            this.apiUsageCurrent = user_metrics.api_usage.usage_current_minute || 0;
            this.apiUsageQuota = user_metrics.api_usage.quota_per_minute || 60;
          }

          const timeSeries = degraded ? [] : user_metrics?.time_series || [];
          this.latencyCategories.set(
            timeSeries.map((d: { label?: string; time?: string }) =>
              String(d.label ?? d.time ?? '').slice(-5),
            ),
          );
          this.latencySeries.set(
            toVikingLineSeries(
              'Latency (ms)',
              timeSeries.map((d: { latency: number }) => d.latency ?? 0),
            ),
          );

          const origins = user_metrics?.origin_distribution || [];
          this.originMapData = origins;

          const topOrigins = [...origins].sort((a: any, b: any) => b.count - a.count).slice(0, 5);
          this.topRegionsCategories.set(
            topOrigins.map((d: { region?: string; country?: string; name?: string }) =>
              String(d.region ?? d.country ?? d.name ?? '—').slice(0, 8),
            ),
          );
          this.topRegionsSeries.set(
            toVikingBarSeries(
              'Requests',
              topOrigins.map((d: { count: number }) => d.count ?? 0),
              'warning',
            ),
          );

          if (this.isBrowser) {
            this.initMap();
          }

          // Prefer dedicated request_frequency; fall back to time_series.requests.
          const reqFreq =
            user_metrics?.request_frequency?.length > 0
              ? user_metrics.request_frequency
              : timeSeries;
          this.frequencyCategories.set(
            reqFreq.map((d: { label?: string; time?: string }) =>
              String(d.label ?? d.time ?? '').slice(-5),
            ),
          );
          this.frequencySeries.set(
            toVikingLineSeries(
              'Requests',
              reqFreq.map((d: { requests: number }) => d.requests ?? 0),
              'muted',
            ),
          );

          const statuses = user_metrics?.http_statuses || [];
          this.statusCategories.set(
            statuses.map((d: { status?: string | number; code?: string | number }) =>
              String(d.status ?? d.code ?? '—'),
            ),
          );
          this.statusSeries.set(
            toVikingBarSeries(
              'Count',
              statuses.map((d: { count: number }) => d.count ?? 0),
            ),
          );
          this.statusStackedSeries.set(toVikingStackedStatusSeries(statuses));

          const endpoints = user_metrics?.endpoint_counts || [];
          this.endpointCategories.set(
            endpoints.map((d: { endpoint?: string; path?: string }) => {
              const raw = String(d.endpoint ?? d.path ?? '—');
              return raw.length > 12 ? `…${raw.slice(-11)}` : raw;
            }),
          );
          this.endpointSeries.set(
            toVikingBarSeries(
              'Calls',
              endpoints.map((d: { count: number }) => d.count ?? 0),
            ),
          );

          const threats = user_metrics?.threat_severity || [];
          this.threatSeveritySegments.set(
            toVikingDonutSegments(
              threats.map((d: { severity: string }) => d.severity),
              threats.map((d: { count: number }) => d.count ?? 0),
            ),
          );

          const alerts = user_metrics?.security_alerts || [];
          this.securityAlertCategories.set(
            alerts.map((d: { label?: string; type?: string }) =>
              String(d.label ?? d.type ?? 'Alert').slice(0, 10),
            ),
          );
          this.securityAlertsSeries.set(
            toVikingBarSeries(
              'Anomalies',
              alerts.map((d: { count: number }) => d.count ?? 0),
              'warning',
            ),
          );
        } else {
          this.metricsDegraded.set(true);
          this.loadError.set('Analytics overview returned an unexpected response.');
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err: { status?: number; error?: { detail?: string; code?: string } }) => {
        console.error('Failed to load analytics data', err);
        this.metricsDegraded.set(true);
        this.uptimePercent = null;
        const code = err?.error?.code;
        const detail = err?.error?.detail;
        if (err?.status === 503 || code === 'forjd_degraded') {
          this.loadError.set(
            detail ||
              'FORJD analytics is unavailable for this account. Check tenant mapping and try again.',
          );
        } else if (err?.status === 401 || err?.status === 403) {
          this.loadError.set(detail || 'Sign in again to load analytics.');
        } else {
          this.loadError.set(detail || 'Unable to load analytics from FORJD.');
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private loadTenants() {
    this.http.get<any>(`${environment.backendUrl}/api/v1/analytics/tenants`).subscribe({
      next: response => {
        if (response.status === 'success' && response.data) {
          this.tenants = response.data;
          this.tenantOptions = this.tenants.map((t: any) => ({
            value: t.id,
            label: t.is_platform ? `${t.name} (Global)` : t.name,
          }));
          if (!this.selectedTenantId && this.tenants.length > 0) {
            const userTenant = this.tenants.find((t: any) => !t.is_platform);
            this.selectedTenantId = userTenant ? userTenant.id : this.tenants[0].id;
          }
        }
        this.loadAnalyticsData();
      },
      error: err => {
        console.error('Failed to load tenants', err);
        this.loadAnalyticsData();
      },
    });
  }

  ngOnDestroy() {
    this.stopAnalyticsPolling();
    if (this.isBrowser) {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }
    if (this.exportPollId) {
      clearInterval(this.exportPollId);
    }
    if (this.liveRefreshTimer) {
      clearTimeout(this.liveRefreshTimer);
    }
    this.liveSub?.unsubscribe();
    this.liveUpdates.stop();
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }

  /** Debounce live change ticks so bursts collapse into one reload. */
  private scheduleLiveRefresh(): void {
    if (this.liveRefreshTimer || document.hidden) {
      return;
    }
    this.liveRefreshTimer = setTimeout(() => {
      this.liveRefreshTimer = undefined;
      this.loadAnalyticsData();
    }, 2000);
  }

  public loadExports(): void {
    this.http.get<ExportJobRow[]>(API_ENDPOINTS.EXPORTS.LIST).subscribe({
      next: rows => {
        this.exportsList = Array.isArray(rows) ? rows : [];
        this.cdr.markForCheck();
        const pending = this.exportsList.some(isExportPending);
        if (pending && !this.exportPollId) {
          this.exportPollId = setInterval(() => this.loadExports(), 4000);
        }
        if (!pending && this.exportPollId) {
          clearInterval(this.exportPollId);
          this.exportPollId = undefined;
        }
      },
      error: () => {
        // Storage may be offline in some envs; keep page usable.
        this.exportsList = [];
        this.cdr.markForCheck();
      },
    });
  }

  public requestExport(): void {
    this.exportBusy = true;
    this.exportMessage = '';
    const payload = buildExportRequestPayload(
      this.exportKind,
      this.exportFormat,
      this.exportDays,
      this.selectedSite,
    );
    const fingerprint = JSON.stringify(payload);
    if (!this.exportIdempotencyKey || this.exportRequestFingerprint !== fingerprint) {
      this.exportIdempotencyKey = crypto.randomUUID();
      this.exportRequestFingerprint = fingerprint;
    }
    this.http
      .post<ExportJobRow>(API_ENDPOINTS.EXPORTS.CREATE, {
        ...payload,
        idempotency_key: this.exportIdempotencyKey,
      })
      .subscribe({
        next: job => {
          this.exportBusy = false;
          this.exportIdempotencyKey = null;
          this.exportRequestFingerprint = '';
          const jobId = job?.id ?? 'unknown';
          this.exportMessage = `Export ${jobId.slice(0, 8)}… ${job?.status ?? 'unknown'}`;
          this.loadExports();
          this.cdr.markForCheck();
        },
        error: err => {
          this.exportBusy = false;
          const detail =
            err?.error?.detail || err?.error?.message || err?.message || 'Export failed';
          this.exportMessage = String(detail);
          this.cdr.markForCheck();
        },
      });
  }

  public downloadExport(jobId: string): void {
    if (!jobId) {
      this.exportMessage = 'Invalid export job ID';
      return;
    }
    this.http
      .get<{ url: string; filename_hint?: string }>(API_ENDPOINTS.EXPORTS.DOWNLOAD(jobId))
      .subscribe({
        next: body => {
          const downloadUrl = body?.url;
          if (downloadUrl && this.isBrowser) {
            window.location.assign(downloadUrl);
          } else {
            this.exportMessage = 'Download URL not available';
            this.cdr.markForCheck();
          }
        },
        error: err => {
          const detail = err?.error?.detail || err?.error?.message || 'Download unavailable';
          this.exportMessage = String(detail);
          this.cdr.markForCheck();
        },
      });
  }

  // --- Export deletion ---
  public deleteExport(jobId: string): void {
    if (!jobId || this.exportDeletingId) {
      return;
    }
    this.exportDeletingId = jobId;
    this.exportMessage = '';
    this.http.delete<{ ok?: boolean }>(API_ENDPOINTS.EXPORTS.DETAIL(jobId)).subscribe({
      next: () => {
        this.exportsList = this.exportsList.filter(job => job.id !== jobId);
        this.exportDeletingId = null;
        this.exportMessage = 'Export deleted';
        this.cdr.markForCheck();
      },
      error: err => {
        this.exportDeletingId = null;
        const detail = err?.error?.detail || err?.error?.message || 'Delete unavailable';
        this.exportMessage = String(detail);
        this.cdr.markForCheck();
      },
    });
  }

  private startAnalyticsPolling(): void {
    if (this.intervalId || document.hidden) {
      return;
    }
    this.intervalId = setInterval(() => this.loadAnalyticsData(), 60000);
  }

  private stopAnalyticsPolling(): void {
    if (!this.intervalId) {
      return;
    }
    clearInterval(this.intervalId);
    this.intervalId = undefined;
  }

  public onTenantChange(tenantId: string): void {
    this.selectedTenantId = tenantId;
    this.selectedSite = 'All';
    this.loadAnalyticsData();
  }

  public onSiteChange(site: string): void {
    this.selectedSite = site;
    this.loadAnalyticsData();
  }

  public formatCount(value: number): string {
    return value.toLocaleString();
  }

  public formatPercent(value: number): string {
    return `${Math.round(value)}%`;
  }

  public formatOptionalPercent(value: number | null | undefined): string {
    return value === null || value === undefined ? 'Awaiting run' : `${value.toFixed(1)}%`;
  }

  public formatBenchmarkError(value: number | null | undefined): string {
    return value === null || value === undefined ? 'Awaiting run' : value.toFixed(4);
  }

  public benchmarkScoreSublabel(): string {
    const reference = this.platformBenchmarkSummary?.score_percent;
    if (reference === null || reference === undefined) {
      return 'Runs with daily model training';
    }
    return `Platform reference ${reference.toFixed(1)}%`;
  }

  private initMap(): void {
    if (!this.isBrowser) return;

    setTimeout(() => {
      const mapContainer = document.getElementById('originMap');
      if (!mapContainer) return;

      if (this.map) {
        this.map.remove();
        this.map = undefined;
        mapContainer.replaceChildren();
      }

      // Ensure the host has a stable pixel size before Leaflet measures it.
      mapContainer.classList.add('viking-map-ready');
      const hostHeight =
        mapContainer.clientHeight ||
        Math.round(parseFloat(getComputedStyle(mapContainer).minHeight || '0') || 352);
      if (hostHeight > 0) {
        mapContainer.style.minHeight = `${hostHeight}px`;
        mapContainer.style.height = `${hostHeight}px`;
      }

      this.map = L.map(mapContainer, {
        zoomControl: false,
        attributionControl: false,
        worldCopyJump: true,
        preferCanvas: false,
      }).setView([20, 0], 2);

      const tileUrl = this.isDarkMode
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

      L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 8,
        minZoom: 1,
        noWrap: false,
        updateWhenIdle: false,
        keepBuffer: 4,
        crossOrigin: true,
      }).addTo(this.map);

      // Leaflet needs real dimensions after flex/grid layout settles,
      // then place markers once the tile pane has a stable size.
      const refreshSize = (): void => {
        if (!this.map) {
          return;
        }
        this.map.invalidateSize({ animate: false });
        // Force tile redraw after size settles (prevents broken/split tiles).
        this.map.eachLayer((layer: L.Layer) => {
          const tileLayer = layer as L.TileLayer & { redraw?: () => void };
          if (typeof tileLayer.redraw === 'function') {
            tileLayer.redraw();
          }
        });
      };
      requestAnimationFrame(refreshSize);
      setTimeout(refreshSize, 80);
      setTimeout(() => {
        refreshSize();
        this.updateMapMarkers();
      }, 200);
      setTimeout(refreshSize, 500);
      setTimeout(refreshSize, 1200);
    }, 50);
  }

  /** Resolve the computed Viking series color used by Leaflet's SVG overlay. */
  private resolveMapAccent(): string {
    const styles = getComputedStyle(document.documentElement);
    return (
      styles.getPropertyValue('--viking-series-1').trim() ||
      styles.getPropertyValue('--viking-accent').trim() ||
      styles.getPropertyValue('--viking-teal-500').trim() ||
      styles.color
    );
  }

  private updateMapMarkers(): void {
    if (!this.map) return;

    this.map.eachLayer(layer => {
      if (layer instanceof L.CircleMarker) {
        this.map?.removeLayer(layer);
      }
    });

    const accent = this.resolveMapAccent();
    const points: L.LatLngExpression[] = [];

    this.originMapData.forEach(loc => {
      const lat = Number(loc.lat ?? loc.latitude);
      const lng = Number(loc.lng ?? loc.lon ?? loc.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }
      const count = Number(loc.count ?? 0) || 1;
      const label = String(loc.origin ?? loc.region ?? loc.country ?? loc.name ?? 'Origin');
      points.push([lat, lng]);
      const marker = L.circleMarker([lat, lng], {
        pane: 'overlayPane',
        radius: Math.max(7, Math.min(22, 6 + Math.sqrt(count) * 2.5)),
        color: accent,
        fillColor: accent,
        fillOpacity: 0.55,
        weight: 2,
        opacity: 0.95,
      })
        .bindTooltip(`${label}: ${count.toLocaleString()} reqs`, {
          direction: 'top',
          sticky: true,
        })
        .addTo(this.map!);
      marker.bringToFront();
    });

    if (points.length > 1) {
      try {
        this.map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 5 });
      } catch {
        /* keep default world view */
      }
    } else if (points.length === 1) {
      this.map.setView(points[0], 3);
    }
  }
}
