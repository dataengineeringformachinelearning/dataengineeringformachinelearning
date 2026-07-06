import {
  Component,
  inject,
  effect,
  signal,
  computed,
  afterNextRender,
  ChangeDetectorRef,
  PLATFORM_ID,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  VikingChart,
  VikingBadge,
  VikingChartSeries,
  VikingGaugeArc,
  VikingPageHeader,
  VikingChartPanel,
  VikingChartCardHeader,
  VikingChartEmptyState,
} from '@dataengineeringformachinelearning/viking-ui';
import { ThemeService } from '../../services/theme.service';
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
import * as L from 'leaflet';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    UnifiedSelect,
    VikingChart,
    VikingBadge,
    VikingGaugeArc,
    VikingAppIcon,
    VikingPageHeader,
    VikingChartPanel,
    VikingChartCardHeader,
    VikingChartEmptyState,
  ],
  templateUrl: './analytics.html',
})
export class AnalyticsComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private themeService = inject(ThemeService);
  private cdr = inject(ChangeDetectorRef);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  public p99Latency = 0;
  public uptimePercent = 0;
  public totalRequests = 0;
  public activeIncidents = 0;
  public widgetInteractions = 0;
  public uniqueVisitors = 0;
  public cookieConsents = 0;
  public activeProviders: string[] = [];
  public isLoading = true;

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
  public temporalForecast = 50;

  latencySeries = signal<VikingChartSeries[]>(toVikingLineSeries('Latency (ms)', []));
  frequencySeries = signal<VikingChartSeries[]>(toVikingLineSeries('Requests', [], 'muted'));
  statusSeries = signal<VikingChartSeries[]>(toVikingBarSeries('Count', []));
  statusStackedSeries = signal<VikingChartSeries[]>([]);
  trafficGroupedSeries = signal<VikingChartSeries[]>([]);
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
  hasTrafficGroupedData = computed(
    () =>
      this.trafficGroupedSeries().length > 1 &&
      hasChartValues(this.trafficGroupedSeries().flatMap(series => series.data)),
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

  public tenantOptions: SelectOption[] = [];

  get isDarkMode(): boolean {
    return this.themeService.theme() === 'dark';
  }

  constructor() {
    effect(() => {
      this.themeService.theme();
      this.updateMapTheme();
    });

    afterNextRender(() => {
      // Data is loaded in ngOnInit to prevent duplicate requests
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
          const { ces, user_metrics } = response.data;

          if (user_metrics?.available_sites) {
            this.availableSites = user_metrics.available_sites;
            this.siteOptions = [
              { value: 'All', label: 'All Sites' },
              ...this.availableSites.map(site => ({ value: site, label: site })),
            ];
          }

          this.cesLevel = ces?.level || 0;
          this.threatLevel = ces?.threat || 0;
          this.slaLevel = ces?.sla || 0;
          this.stabilityLevel = ces?.stability || 0;
          this.temporalForecast =
            response.data?.spiking_temporal_forecast || ces?.spiking_temporal_forecast || 50;

          this.p99Latency = user_metrics?.p99_latency_ms || 0;
          this.uptimePercent = user_metrics?.uptime_percent || 0;
          this.totalRequests = user_metrics?.total_requests_24h || 0;
          this.activeIncidents = user_metrics?.active_incidents || 0;

          this.widgetInteractions = user_metrics?.widget_interactions || 0;
          this.uniqueVisitors = user_metrics?.unique_visitors || 0;
          this.cookieConsents =
            (user_metrics?.cookie_consents?.analytical || 0) +
            (user_metrics?.cookie_consents?.marketing || 0);
          this.activeProviders = user_metrics?.active_providers || [];

          if (user_metrics?.api_usage) {
            this.apiUsageCurrent = user_metrics.api_usage.usage_current_minute || 0;
            this.apiUsageQuota = user_metrics.api_usage.quota_per_minute || 60;
          }

          const timeSeries = user_metrics?.time_series || [];
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

          const reqFreq = user_metrics?.request_frequency || [];
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

          const freqData = reqFreq.map((d: { requests: number }) => d.requests ?? 0);
          const latData = timeSeries.map((d: { latency: number }) => d.latency ?? 0);
          const groupedLen = Math.min(freqData.length, latData.length);
          if (groupedLen >= 2) {
            this.trafficGroupedSeries.set([
              { name: 'Requests', data: freqData.slice(0, groupedLen), tone: 'accent' },
              { name: 'Latency (ms)', data: latData.slice(0, groupedLen), tone: 'info' },
            ]);
          } else {
            this.trafficGroupedSeries.set([]);
          }

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
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Failed to load analytics data', err);
        this.isLoading = false;
        this.cdr.detectChanges();
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

  ngOnInit() {
    if (this.isBrowser) {
      this.loadTenants();

      this.intervalId = setInterval(() => {
        this.loadAnalyticsData();
      }, 60000);
    }
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
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

      this.map = L.map('originMap', {
        zoomControl: false,
        attributionControl: false,
      }).setView([20, 0], 2);

      const tileUrl = this.isDarkMode
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

      L.tileLayer(tileUrl, {
        attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
      }).addTo(this.map);

      this.updateMapMarkers();

      setTimeout(() => {
        this.map?.invalidateSize();
      }, 100);
      setTimeout(() => {
        this.map?.invalidateSize();
      }, 400);
    }, 100);
  }

  private updateMapMarkers(): void {
    if (!this.map) return;

    this.map.eachLayer(layer => {
      if (layer instanceof L.CircleMarker) {
        this.map?.removeLayer(layer);
      }
    });

    this.originMapData.forEach(loc => {
      if (loc.lat && loc.lng) {
        L.circleMarker([loc.lat, loc.lng], {
          radius: Math.max(6, Math.min(24, loc.count / 2)),
          color: 'var(--viking-teal-600)',
          fillColor: 'var(--viking-teal-600)',
          fillOpacity: 0.6,
          weight: 2,
        })
          .bindTooltip(`${loc.origin}: ${loc.count} reqs`, {
            direction: 'top',
          })
          .addTo(this.map!);
      }
    });
  }
}
