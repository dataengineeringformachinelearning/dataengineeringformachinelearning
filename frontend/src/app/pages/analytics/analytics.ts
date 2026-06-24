import {
  Component,
  inject,
  effect,
  afterNextRender,
  ChangeDetectorRef,
  PLATFORM_ID,
  OnInit,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { ThemeService } from '../../services/theme.service';
import {
  UnifiedSelect,
  SelectOption,
} from '../../components/unified-select/unified-select.component';
import { environment } from '../../../environments/environment';

export interface SvgPoint {
  x: number;
  y: number;
  label: string;
  value: number;
}
export interface SvgBar {
  label: string;
  value: number;
  heightPercent: number;
}
export interface SvgArc {
  label: string;
  value: number;
  color: string;
  dasharray: string;
  dashoffset: number;
}
export interface MapMarker {
  x: number;
  y: number;
  r: number;
  label: string;
}
export interface Candlestick {
  x: number;
  yBody: number;
  hBody: number;
  highY: number;
  lowY: number;
  color: string;
  label: string;
  candleWidth: number;
  center: number;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, MatIconModule, UnifiedSelect],
  templateUrl: './analytics.html',
  styleUrls: ['./analytics.scss'],
})
export class AnalyticsComponent implements OnInit {
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
  public averageLatency = 0;
  public errorRatePercent = 0;
  public activeThreats = 0;
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

  // Native SVG Chart Data
  public latencyData: SvgPoint[] = [];
  public latencyPath = '';
  public latencyArea = '';
  public latencyMax = 0;

  public frequencyData: SvgPoint[] = [];
  public frequencyPath = '';
  public frequencyArea = '';
  public frequencyMax = 0;

  public endpointData: SvgBar[] = [];
  public statusData: SvgBar[] = [];
  public securityAlertsData: SvgBar[] = [];
  public threatData: SvgArc[] = [];

  public candlestickElements: Candlestick[] = [];
  public candlestickMax = 0;

  public mapMarkers: MapMarker[] = [];

  get isDarkMode(): boolean {
    return this.themeService.theme() === 'dark';
  }

  constructor() {
    effect(() => {
      this.themeService.theme();
    });

    afterNextRender(() => {
      this.loadAnalyticsData();
    });
  }

  private generateAreaPath(
    data: any[],
    valueKey: string,
  ): { path: string; area: string; points: SvgPoint[]; max: number } {
    if (!data || data.length === 0) return { path: '', area: '', points: [], max: 0 };

    const values = data.map(d => Number(d[valueKey]) || 0);
    const maxVal = Math.max(...values, 1);
    const points: SvgPoint[] = [];

    // SVG Coordinate System (0,0 is top left). Viewbox 1000 x 300
    const w = 1000;
    const h = 300;

    const stepX = data.length > 1 ? w / (data.length - 1) : w;

    let path = '';

    data.forEach((d, i) => {
      const val = Number(d[valueKey]) || 0;
      const x = i * stepX;
      // Invert Y so higher value is higher on screen
      const y = h - (val / maxVal) * h;

      points.push({ x, y, label: d.time || d.label, value: val });

      if (i === 0) {
        path += `M ${x},${y} `;
      } else {
        path += `L ${x},${y} `;
      }
    });

    const area = `${path} L ${w},${h} L 0,${h} Z`;
    return { path, area, points, max: maxVal };
  }

  private generateCandlesticks(data: any[]): { elements: Candlestick[]; max: number } {
    if (!data || data.length === 0) return { elements: [], max: 0 };
    const maxVal = Math.max(...data.map((d: any) => Number(d.high) || 0), 1);
    const elements: Candlestick[] = [];

    const w = 1000;
    const h = 300;
    const stepX = data.length > 0 ? w / data.length : w;
    const candleWidth = stepX * 0.6;

    data.forEach((d: any, i: number) => {
      const open = Number(d.open) || 0;
      const close = Number(d.close) || 0;
      const high = Number(d.high) || 0;
      const low = Number(d.low) || 0;

      const x = i * stepX + (stepX - candleWidth) / 2;
      const center = i * stepX + stepX / 2;

      const openY = h - (open / maxVal) * h;
      const closeY = h - (close / maxVal) * h;
      const highY = h - (high / maxVal) * h;
      const lowY = h - (low / maxVal) * h;

      const topY = Math.min(openY, closeY);
      const bottomY = Math.max(openY, closeY);
      let hBody = bottomY - topY;
      if (hBody < 2) hBody = 2; // minimum height

      // For latency, lower is better. Green if close < open (latency went down)
      const color =
        close <= open ? 'var(--emerald-green, #10b981)' : 'var(--carrot-orange, #f97316)';

      elements.push({
        x,
        yBody: topY,
        hBody,
        highY,
        lowY,
        color,
        label: d.time || '',
        candleWidth,
        center,
      });
    });

    return { elements, max: maxVal };
  }

  private generateBars(data: any[], labelKey: string, valueKey: string): SvgBar[] {
    if (!data || data.length === 0) return [];
    const maxVal = Math.max(...data.map(d => Number(d[valueKey]) || 0), 1);
    return data.map(d => ({
      label: d[labelKey],
      value: Number(d[valueKey]) || 0,
      heightPercent: ((Number(d[valueKey]) || 0) / maxVal) * 100,
    }));
  }

  private generateDonut(data: any[], labelKey: string, valueKey: string): SvgArc[] {
    if (!data || data.length === 0) return [];
    const total = data.reduce((sum, d) => sum + (Number(d[valueKey]) || 0), 0) || 1;
    const colors = [
      'var(--carrot-orange)',
      'var(--golden-pollen)',
      'var(--blue-bell)',
      'var(--crayola-blue)',
    ];

    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    let currentOffset = 0;

    return data.map((d, i) => {
      const val = Number(d[valueKey]) || 0;
      const percent = val / total;
      const dash = percent * circumference;

      const arc: SvgArc = {
        label: d[labelKey],
        value: val,
        color: colors[i % colors.length],
        dasharray: `${dash} ${circumference}`,
        dashoffset: -currentOffset,
      };

      currentOffset += dash;
      return arc;
    });
  }

  private generateMapMarkers(origins: any[]): MapMarker[] {
    if (!origins || origins.length === 0) return [];
    // Basic Mercator-ish mapping onto a 1000x500 viewBox SVG
    // x: -180 to 180 -> 0 to 1000
    // y: 90 to -90 -> 0 to 500
    return origins.map(loc => {
      const x = ((loc.lng + 180) / 360) * 1000;
      // simplified y mapping
      let latRad = (loc.lat * Math.PI) / 180;
      let mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
      let y = 250 - (250 * mercN) / Math.PI;

      return {
        x: Math.max(0, Math.min(1000, x)),
        y: Math.max(0, Math.min(500, y)),
        r: Math.max(4, Math.min(16, loc.count / 2)),
        label: `${loc.origin}: ${loc.count} reqs`,
      };
    });
  }

  public getGaugeStroke(value: number, circumference: number): string {
    const dash = (value / 100) * circumference;
    return `${dash} ${circumference}`;
  }

  public hasData(dataArray: any[]): boolean {
    return dataArray && dataArray.length > 0;
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
          this.averageLatency = user_metrics?.average_latency_ms || 0;
          this.errorRatePercent = user_metrics?.error_rate_percent || 0;
          this.activeThreats = user_metrics?.active_threats || 0;

          if (user_metrics?.api_usage) {
            this.apiUsageCurrent = user_metrics.api_usage.usage_current_minute || 0;
            this.apiUsageQuota = user_metrics.api_usage.quota_per_minute || 60;
          }

          // Parse Time Series for System Latency
          const timeSeries = user_metrics?.time_series || [];
          const latencyRes = this.generateAreaPath(timeSeries, 'latency');
          this.latencyPath = latencyRes.path;
          this.latencyArea = latencyRes.area;
          this.latencyData = latencyRes.points;
          this.latencyMax = latencyRes.max;

          // Parse Candlesticks
          const cdata = user_metrics?.candlestick_data || [];
          const candleRes = this.generateCandlesticks(cdata);
          this.candlestickElements = candleRes.elements;
          this.candlestickMax = candleRes.max;

          // Parse Origin Distribution
          const origins = user_metrics?.origin_distribution || [];
          this.mapMarkers = this.generateMapMarkers(origins);

          // Parse Request Frequency
          const reqFreq = user_metrics?.request_frequency || [];
          const freqRes = this.generateAreaPath(reqFreq, 'requests');
          this.frequencyPath = freqRes.path;
          this.frequencyArea = freqRes.area;
          this.frequencyData = freqRes.points;
          this.frequencyMax = freqRes.max;

          // Parse HTTP Status
          const statuses = user_metrics?.http_statuses || [];
          this.statusData = this.generateBars(statuses, 'status', 'count');

          // Parse Endpoints
          const endpoints = user_metrics?.endpoint_counts || [];
          this.endpointData = this.generateBars(endpoints, 'endpoint', 'count');

          // Parse Threat Severity
          const threats = user_metrics?.threat_severity || [];
          this.threatData = this.generateDonut(threats, 'severity', 'count');

          // Parse Security Alerts
          const alerts = user_metrics?.security_alerts || [];
          this.securityAlertsData = this.generateBars(alerts, 'time', 'count');
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
          if (!this.selectedTenantId && this.tenants.length > 0) {
            const platformTenant = this.tenants.find((t: any) => t.is_platform);
            this.selectedTenantId = platformTenant ? platformTenant.id : this.tenants[0].id;
          }
        }
      },
      error: err => console.error('Failed to load tenants', err),
    });
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.loadTenants();
      this.loadAnalyticsData();

      setInterval(() => {
        this.loadAnalyticsData();
      }, 60000);
    }
  }

  public onTenantChange(event: any) {
    this.selectedTenantId = event.target.value;
    this.selectedSite = 'All'; // reset site selection when tenant changes
    this.loadAnalyticsData();
  }

  public onSiteChange(site: any) {
    this.selectedSite = site;
    this.loadAnalyticsData();
  }
}
