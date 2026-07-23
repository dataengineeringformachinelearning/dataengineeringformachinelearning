import {
  Component,
  inject,
  effect,
  signal,
  computed,
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
  VikingSpinner,
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
import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { LiveUpdatesService } from '../../services/live-updates.service';
import { API_ENDPOINTS } from '../../core/constants/api.constants';
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

type AnalyticsTenant = {
  id: string;
  name: string;
  is_platform: boolean;
};

type TenantListResponse = {
  status: string;
  data?: AnalyticsTenant[];
};

type TimeSeriesPoint = {
  label?: string;
  time?: string;
  latency: number;
  requests: number;
};

type RequestFrequencyPoint = {
  label?: string;
  time?: string;
  requests: number;
};

type OriginMapPoint = {
  count: number;
  lat?: number | string;
  latitude?: number | string;
  lng?: number | string;
  lon?: number | string;
  longitude?: number | string;
  origin?: string;
  region?: string;
  country?: string;
  name?: string;
};

type AnalyticsOverviewResponse = {
  status: string;
  degraded?: boolean;
  code?: string;
  data?: {
    benchmarking?: {
      current_scope?: BenchmarkRollup | null;
      platform_reference?: BenchmarkRollup | null;
    };
    honeypot_score?: number;
    spiking_temporal_forecast?: number;
    ces?: {
      level?: number;
      threat?: number;
      sla?: number;
      stability?: number;
      spiking_temporal_forecast?: number;
      latest_benchmark_score?: number | null;
      latest_benchmark?: BenchmarkRollup | null;
    };
    user_metrics?: {
      data_available?: boolean;
      available_sites?: string[];
      p99_latency_ms?: number;
      uptime_percent?: number | null;
      total_requests_24h?: number;
      active_incidents?: number;
      widget_interactions?: number;
      unique_visitors?: number;
      cookie_consents?: { analytical?: number; marketing?: number };
      active_providers?: string[];
      api_usage?: { usage_current_minute?: number; quota_per_minute?: number };
      time_series?: TimeSeriesPoint[];
      request_frequency?: RequestFrequencyPoint[];
      origin_distribution?: OriginMapPoint[];
      http_statuses?: { status?: string | number; code?: string | number; count: number }[];
      endpoint_counts?: { endpoint?: string; path?: string; count: number }[];
      threat_severity?: { severity: string; count: number }[];
      security_alerts?: { label?: string; type?: string; count: number }[];
    };
  };
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
    VikingSpinner,
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
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private liveUpdates = inject(LiveUpdatesService);
  private analyticsBootstrapped = false;

  // --- Metric / filter signals ---
  public p99Latency = signal(0);
  public uptimePercent = signal<number | null>(0);
  public totalRequests = signal(0);
  public activeIncidents = signal(0);
  public widgetInteractions = signal(0);
  public uniqueVisitors = signal(0);
  public cookieConsents = signal(0);
  public activeProviders = signal<string[]>([]);
  public isLoading = signal(true);
  metricsDegraded = signal(false);
  loadError = signal<string | null>(null);

  public apiUsageCurrent = signal(0);
  public apiUsageQuota = signal(60);

  public latencyTrend = signal('');
  public originTrend = signal('');
  public frequencyTrend = signal('');
  public endpointTrend = signal('');
  public statusTrend = signal('');
  public threatTrend = signal('');
  public anomalyTrend = signal('');

  public tenants = signal<AnalyticsTenant[]>([]);
  public selectedTenantId = signal<string | null>(null);
  public availableSites = signal<string[]>([]);
  public siteOptions = signal<SelectOption[]>([{ value: 'All', label: 'All Sites' }]);
  public selectedSite = signal<string | null>(null);
  public tenantOptions = signal<SelectOption[]>([]);

  public cesLevel = signal(0);
  public threatLevel = signal(0);
  public slaLevel = signal(0);
  public stabilityLevel = signal(0);
  public temporalForecast = signal(0);
  public honeypotScore = signal(0);
  public latestBenchmarkScore = signal<number | null>(null);
  public latestBenchmark = signal<BenchmarkRollup | null>(null);
  public benchmarkSummary = signal<BenchmarkRollup | null>(null);
  public platformBenchmarkSummary = signal<BenchmarkRollup | null>(null);

  // --- Chart series (already signal-based) ---
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

  public originMapData = signal<OriginMapPoint[]>([]);
  public map: L.Map | undefined;
  private intervalId: ReturnType<typeof setInterval> | undefined;
  private exportPollId: ReturnType<typeof setInterval> | undefined;
  private liveRefreshTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly onVisibilityChange = (): void => {
    if (document.hidden) {
      this.stopAnalyticsPolling();
      return;
    }

    this.loadAnalyticsData();
    this.startAnalyticsPolling();
  };

  // --- Export job signals ---
  public exportKind = signal('analytics');
  public exportFormat = signal('csv');
  public exportDays = signal(7);
  public exportBusy = signal(false);
  public exportMessage = signal('');
  public exportDeletingId = signal<string | null>(null);
  public exportsList = signal<ExportJobRow[]>([]);
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
    return String(this.exportDays());
  }

  public onExportDaysChange(value: string): void {
    const n = Number.parseInt(value, 10);
    this.exportDays.set(Number.isFinite(n) ? Math.min(90, Math.max(1, n)) : 7);
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
      this.liveUpdates.start();
    });

    // Live FORJD→Django SSE: refresh overview when projections tick.
    effect(() => {
      const evt = this.liveUpdates.latestEvent();
      if (evt?.type === 'projections') this.scheduleLiveRefresh();
    });

    // Typed SSE degraded frame — Viking callout without inventing empty metrics.
    effect(() => {
      if (!this.liveUpdates.degraded()) return;
      this.metricsDegraded.set(true);
      this.loadError.set(
        'Live FORJD projection updates are unavailable. Showing the last successful overview.',
      );
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
    this.isLoading.set(true);
    this.loadError.set(null);
    let url = API_ENDPOINTS.ANALYTICS.OVERVIEW;
    const params = [];
    if (this.selectedTenantId()) {
      params.push(`tenant_id=${this.selectedTenantId()}`);
    }
    if (this.selectedSite() && this.selectedSite() !== 'All') {
      params.push(`site_url=${encodeURIComponent(this.selectedSite()!)}`);
    }
    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    this.http.get<AnalyticsOverviewResponse>(url).subscribe({
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
            this.availableSites.set(user_metrics.available_sites);
            this.siteOptions.set([
              { value: 'All', label: 'All Sites' },
              ...user_metrics.available_sites.map((site: string) => ({
                value: site,
                label: site,
              })),
            ]);
          }

          this.cesLevel.set(degraded ? 0 : (ces?.level ?? 0));
          this.threatLevel.set(degraded ? 0 : (ces?.threat ?? 0));
          this.slaLevel.set(degraded ? 0 : (ces?.sla ?? 0));
          this.stabilityLevel.set(degraded ? 0 : (ces?.stability ?? 0));
          this.temporalForecast.set(
            degraded
              ? 0
              : (response.data?.spiking_temporal_forecast ?? ces?.spiking_temporal_forecast ?? 0),
          );
          this.honeypotScore.set(degraded ? 0 : (response.data?.honeypot_score ?? 0));
          this.latestBenchmarkScore.set(degraded ? null : (ces?.latest_benchmark_score ?? null));
          this.latestBenchmark.set(degraded ? null : (ces?.latest_benchmark ?? null));
          this.benchmarkSummary.set(degraded ? null : (benchmarking?.current_scope ?? null));
          this.platformBenchmarkSummary.set(
            degraded ? null : (benchmarking?.platform_reference ?? null),
          );

          this.p99Latency.set(degraded ? 0 : (user_metrics?.p99_latency_ms ?? 0));
          this.uptimePercent.set(degraded ? null : (user_metrics?.uptime_percent ?? null));
          this.totalRequests.set(degraded ? 0 : (user_metrics?.total_requests_24h ?? 0));
          this.activeIncidents.set(degraded ? 0 : (user_metrics?.active_incidents ?? 0));

          this.widgetInteractions.set(degraded ? 0 : user_metrics?.widget_interactions || 0);
          this.uniqueVisitors.set(degraded ? 0 : user_metrics?.unique_visitors || 0);
          this.cookieConsents.set(
            degraded
              ? 0
              : (user_metrics?.cookie_consents?.analytical || 0) +
                  (user_metrics?.cookie_consents?.marketing || 0),
          );
          this.activeProviders.set(degraded ? [] : user_metrics?.active_providers || []);

          if (!degraded && user_metrics?.api_usage) {
            this.apiUsageCurrent.set(user_metrics.api_usage.usage_current_minute || 0);
            this.apiUsageQuota.set(user_metrics.api_usage.quota_per_minute || 60);
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
          this.originMapData.set(origins);

          const topOrigins = [...origins].sort((a, b) => b.count - a.count).slice(0, 5);
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
          const requestFrequency = user_metrics?.request_frequency ?? [];
          const reqFreq = requestFrequency.length > 0 ? requestFrequency : timeSeries;
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
        this.isLoading.set(false);
      },
      error: (err: { status?: number; error?: { detail?: string; code?: string } }) => {
        console.error('Failed to load analytics data', err);
        this.metricsDegraded.set(true);
        this.uptimePercent.set(null);
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
        this.isLoading.set(false);
      },
    });
  }

  private loadTenants() {
    this.http.get<TenantListResponse>(API_ENDPOINTS.ANALYTICS.TENANTS).subscribe({
      next: response => {
        if (response.status === 'success' && response.data) {
          this.tenants.set(response.data);
          this.tenantOptions.set(
            response.data.map(tenant => ({
              value: tenant.id,
              label: tenant.is_platform ? `${tenant.name} (Global)` : tenant.name,
            })),
          );
          if (!this.selectedTenantId() && response.data.length > 0) {
            const userTenant = response.data.find(tenant => !tenant.is_platform);
            this.selectedTenantId.set(userTenant ? userTenant.id : response.data[0].id);
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
        const list = Array.isArray(rows) ? rows : [];
        this.exportsList.set(list);
        const pending = list.some(isExportPending);
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
        this.exportsList.set([]);
      },
    });
  }

  public requestExport(): void {
    this.exportBusy.set(true);
    this.exportMessage.set('');
    const payload = buildExportRequestPayload(
      this.exportKind(),
      this.exportFormat(),
      this.exportDays(),
      this.selectedSite(),
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
          this.exportBusy.set(false);
          this.exportIdempotencyKey = null;
          this.exportRequestFingerprint = '';
          const jobId = job?.id ?? 'unknown';
          this.exportMessage.set(`Export ${jobId.slice(0, 8)}… ${job?.status ?? 'unknown'}`);
          this.loadExports();
        },
        error: err => {
          this.exportBusy.set(false);
          const detail =
            err?.error?.detail || err?.error?.message || err?.message || 'Export failed';
          this.exportMessage.set(String(detail));
        },
      });
  }

  public downloadExport(jobId: string): void {
    if (!jobId) {
      this.exportMessage.set('Invalid export job ID');
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
            this.exportMessage.set('Download URL not available');
          }
        },
        error: err => {
          const detail = err?.error?.detail || err?.error?.message || 'Download unavailable';
          this.exportMessage.set(String(detail));
        },
      });
  }

  // --- Export deletion ---
  public deleteExport(jobId: string): void {
    if (!jobId || this.exportDeletingId()) {
      return;
    }
    this.exportDeletingId.set(jobId);
    this.exportMessage.set('');
    this.http.delete<{ ok?: boolean }>(API_ENDPOINTS.EXPORTS.DETAIL(jobId)).subscribe({
      next: () => {
        this.exportsList.update(list => list.filter(job => job.id !== jobId));
        this.exportDeletingId.set(null);
        this.exportMessage.set('Export deleted');
      },
      error: err => {
        this.exportDeletingId.set(null);
        const detail = err?.error?.detail || err?.error?.message || 'Delete unavailable';
        this.exportMessage.set(String(detail));
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
    this.selectedTenantId.set(tenantId);
    this.selectedSite.set('All');
    this.loadAnalyticsData();
  }

  public onSiteChange(site: string): void {
    this.selectedSite.set(site);
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
    const reference = this.platformBenchmarkSummary()?.score_percent;
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

    this.originMapData().forEach(loc => {
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
