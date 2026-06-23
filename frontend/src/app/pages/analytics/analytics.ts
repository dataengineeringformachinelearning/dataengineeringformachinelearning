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
import { NgApexchartsModule } from 'ng-apexcharts';
import { MatIconModule } from '@angular/material/icon';
import { ThemeService } from '../../services/theme.service';
import {
  UnifiedSelect,
  SelectOption,
} from '../../components/unified-select/unified-select.component';
import { environment } from '../../../environments/environment';
import * as L from 'leaflet';

export interface ChartOptions {
  series: any;
  chart: any;
  xaxis?: any;
  yaxis?: any;
  dataLabels?: any;
  grid?: any;
  stroke?: any;
  plotOptions?: any;
  labels?: any;
  colors?: any;
  legend?: any;
  fill?: any;
  tooltip?: any;
  noData?: any;
  markers?: any;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, MatIconModule, UnifiedSelect],
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

  // Chart configs
  public chartOptions: ChartOptions;
  public frequencyChartOptions: ChartOptions;
  public statusChartOptions: ChartOptions;
  public endpointChartOptions: ChartOptions;
  public threatSeverityChartOptions: ChartOptions;
  public securityAlertsChartOptions: ChartOptions;

  public originMapData: any[] = [];
  private map: L.Map | undefined;

  get isDarkMode(): boolean {
    return this.themeService.theme() === 'dark';
  }

  constructor() {
    this.chartOptions = this.getEmptyAreaChart('var(--crayola-blue)', 'Latency (ms)');
    this.frequencyChartOptions = this.getEmptyAreaChart('var(--blue-bell)', 'Requests');
    this.statusChartOptions = this.getEmptyBarChart('var(--crayola-blue)', 'Status Count');
    this.endpointChartOptions = this.getEmptyBarChart('var(--crayola-blue)', 'Endpoint Calls');
    this.threatSeverityChartOptions = this.getEmptyDonutChart();
    this.securityAlertsChartOptions = this.getEmptyBarChart('var(--carrot-orange)', 'Anomalies');

    effect(() => {
      this.themeService.theme();
      this.updateChartTheme();
    });

    afterNextRender(() => {
      this.loadAnalyticsData();
    });
  }

  private getEmptyAreaChart(color: string, seriesName: string): ChartOptions {
    return {
      series: [{ name: seriesName, data: [] }],
      chart: {
        type: 'area',
        sparkline: { enabled: false },
        height: '100%',
        width: '100%',
        parentHeightOffset: 0,
        toolbar: { show: false },
        background: 'transparent',
        animations: { enabled: true, easing: 'easeinout', speed: 800 },
        dropShadow: { enabled: true, color: color, top: 4, left: 0, blur: 10, opacity: 0.2 },
      },
      colors: [color],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2, colors: [color] },
      fill: {},
      markers: { size: 0, hover: { size: 5 } },
      xaxis: {
        type: 'category',
        categories: [],
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {},
      grid: { show: true },
      tooltip: {},
      noData: {
        text: 'No Telemetry Signal Available',
        align: 'center',
        verticalAlign: 'middle',
        style: { color: 'var(--text-muted)', fontSize: '14px', fontFamily: 'Inter' },
      },
    };
  }

  private getEmptyBarChart(color: string, seriesName: string): ChartOptions {
    return {
      series: [{ name: seriesName, data: [] }],
      chart: {
        type: 'bar',
        height: '100%',
        width: '100%',
        parentHeightOffset: 0,
        toolbar: { show: false },
        background: 'transparent',
        dropShadow: { enabled: true, color: color, top: 4, left: 0, blur: 10, opacity: 0.2 },
      },
      colors: [color],
      plotOptions: { bar: { borderRadius: 4, borderRadiusApplication: 'end', columnWidth: '35%' } },
      dataLabels: { enabled: false },
      stroke: { width: 0 },
      fill: {},
      xaxis: {
        type: 'category',
        categories: [],
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {},
      grid: { show: true },
      tooltip: {},
      noData: {
        text: 'No Telemetry Signal Available',
        align: 'center',
        verticalAlign: 'middle',
        style: { color: 'var(--text-muted)', fontSize: '14px', fontFamily: 'Inter' },
      },
    };
  }

  private getEmptyDonutChart(): ChartOptions {
    return {
      series: [],
      chart: {
        type: 'donut',
        height: '100%',
        width: '100%',
        parentHeightOffset: 0,
        background: 'transparent',
        dropShadow: {
          enabled: true,
          color: 'var(--jet-black)',
          top: 4,
          left: 0,
          blur: 10,
          opacity: 0.2,
        },
      },
      labels: [],
      colors: [
        'var(--crayola-blue)',
        'var(--blue-bell)',
        'var(--golden-pollen)',
        'var(--carrot-orange)',
        'var(--jet-black)',
      ],
      plotOptions: { pie: { donut: { size: '70%', labels: { show: true } } } },
      dataLabels: { enabled: false },
      stroke: { width: 2, colors: ['var(--color-surface)'] },
      legend: { position: 'bottom', labels: { colors: 'var(--text-color)' } },
      tooltip: { theme: 'dark' },
      noData: {
        text: 'No Telemetry Signal Available',
        align: 'center',
        verticalAlign: 'middle',
        style: { color: 'var(--text-muted)', fontSize: '14px', fontFamily: 'Inter' },
      },
    };
  }

  private updateChartTheme() {
    const tooltipTheme = this.isDarkMode ? 'dark' : 'light';
    const textColor = this.isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(15, 23, 42, 0.4)';
    const gridColor = this.isDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.06)';
    const surfaceColor = this.isDarkMode ? '#1e1e1e' : '#ffffff';
    const shadowOpacity = this.isDarkMode ? 0.3 : 0.15;
    const fillAreaOpacityFrom = this.isDarkMode ? 0.2 : 0.12;
    const fillBarOpacity = this.isDarkMode ? 0.15 : 0.08;

    const updateAxis = (chartOpts: ChartOptions) => {
      if (chartOpts.xaxis)
        chartOpts.xaxis.labels = {
          rotate: 0,
          rotateAlways: false,
          style: { colors: textColor, fontFamily: 'Inter, sans-serif' },
        };
      if (chartOpts.yaxis)
        chartOpts.yaxis.labels = { style: { colors: textColor, fontFamily: 'Inter, sans-serif' } };

      if (chartOpts.grid) {
        chartOpts.grid.borderColor = gridColor;
        chartOpts.grid.strokeDashArray = 4;
        chartOpts.grid.xaxis = { lines: { show: false } };
        chartOpts.grid.yaxis = { lines: { show: true } };
      }

      if (chartOpts.tooltip) {
        chartOpts.tooltip.theme = tooltipTheme;
        chartOpts.tooltip.custom = undefined;
        chartOpts.tooltip.x = { show: true };
        chartOpts.tooltip.shared = true;
        chartOpts.tooltip.intersect = false;
      }

      if (chartOpts.chart && chartOpts.chart.dropShadow)
        chartOpts.chart.dropShadow.opacity = shadowOpacity;

      if (chartOpts.chart?.type === 'area') {
        chartOpts.fill = {
          type: 'gradient',
          gradient: {
            shadeIntensity: 1,
            opacityFrom: fillAreaOpacityFrom,
            opacityTo: 0,
            stops: [0, 100],
          },
        };
      } else if (chartOpts.chart?.type === 'bar') {
        chartOpts.fill = { type: 'solid', opacity: fillBarOpacity };
      }

      if (chartOpts.stroke && chartOpts.chart?.type === 'donut') {
        chartOpts.stroke.colors = [surfaceColor];
        if (chartOpts.plotOptions?.pie?.donut?.labels) {
          chartOpts.plotOptions.pie.donut.labels.show = true;
          chartOpts.plotOptions.pie.donut.labels.name = { color: textColor };
          chartOpts.plotOptions.pie.donut.labels.value = {
            color: this.isDarkMode ? '#ffffff' : '#000000',
          };
          chartOpts.plotOptions.pie.donut.labels.total = {
            show: true,
            showAlways: true,
            label: 'Total',
            color: textColor,
          };
        }
      }
      if (chartOpts.legend)
        chartOpts.legend.labels = { colors: textColor, fontFamily: 'Inter, sans-serif' };

      if (chartOpts === this.endpointChartOptions && chartOpts.xaxis) {
        chartOpts.xaxis.labels = { show: false };
        chartOpts.xaxis.axisTicks = { show: false };
      }

      if (
        (chartOpts === this.frequencyChartOptions ||
          chartOpts === this.chartOptions ||
          chartOpts === this.securityAlertsChartOptions) &&
        chartOpts.xaxis
      ) {
        chartOpts.xaxis.tickAmount = 6;
      }

      return { ...chartOpts };
    };

    this.chartOptions = updateAxis(this.chartOptions);
    this.frequencyChartOptions = updateAxis(this.frequencyChartOptions);
    this.statusChartOptions = updateAxis(this.statusChartOptions);
    this.endpointChartOptions = updateAxis(this.endpointChartOptions);
    this.threatSeverityChartOptions = updateAxis(this.threatSeverityChartOptions);
    this.securityAlertsChartOptions = updateAxis(this.securityAlertsChartOptions);
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

  public hasData(options: ChartOptions): boolean {
    if (!options || !options.series) return false;
    if (options.chart?.type === 'donut') {
      return options.series.length > 0;
    }
    if (options.series.length > 0 && options.series[0].data) {
      return options.series[0].data.length > 0;
    }
    return false;
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

          if (user_metrics?.api_usage) {
            this.apiUsageCurrent = user_metrics.api_usage.usage_current_minute || 0;
            this.apiUsageQuota = user_metrics.api_usage.quota_per_minute || 60;
          }

          // Parse Time Series for System Latency
          const timeSeries = user_metrics?.time_series || [];
          this.chartOptions.series = [
            { name: 'Latency (ms)', data: timeSeries.map((d: any) => d.latency) },
          ];
          this.chartOptions.xaxis.categories = timeSeries.map((d: any) => d.time);

          // Parse Origin Distribution
          const origins = user_metrics?.origin_distribution || [];
          this.originMapData = origins;
          if (this.isBrowser) {
            this.initMap();
          }

          // Parse Request Frequency
          const reqFreq = user_metrics?.request_frequency || [];
          this.frequencyChartOptions.series = [
            { name: 'Requests', data: reqFreq.map((d: any) => d.requests) },
          ];
          this.frequencyChartOptions.xaxis.categories = reqFreq.map((d: any) => d.time);

          // Parse HTTP Status
          const statuses = user_metrics?.http_statuses || [];
          this.statusChartOptions.series = [
            { name: 'Count', data: statuses.map((d: any) => d.count) },
          ];
          this.statusChartOptions.xaxis.categories = statuses.map((d: any) => d.status);

          // Parse Endpoints
          const endpoints = user_metrics?.endpoint_counts || [];
          this.endpointChartOptions.series = [
            { name: 'Calls', data: endpoints.map((d: any) => d.count) },
          ];
          this.endpointChartOptions.xaxis.categories = endpoints.map((d: any) => d.endpoint);

          // Parse Threat Severity
          const threats = user_metrics?.threat_severity || [];
          this.threatSeverityChartOptions.series = threats.map((d: any) => d.count);
          this.threatSeverityChartOptions.labels = threats.map((d: any) => d.severity);
          this.threatSeverityChartOptions.colors = [
            'var(--carrot-orange)',
            'var(--golden-pollen)',
            'var(--blue-bell)',
            'var(--crayola-blue)',
          ];

          // Parse Security Alerts
          const alerts = user_metrics?.security_alerts || [];
          this.securityAlertsChartOptions.series = [
            { name: 'Anomalies', data: alerts.map((d: any) => d.count) },
          ];
          this.securityAlertsChartOptions.xaxis.categories = alerts.map((d: any) => d.time);

          this.updateChartTheme(); // trigger update to apply objects
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

  private initMap() {
    if (!this.isBrowser) return;

    setTimeout(() => {
      const mapContainer = document.getElementById('originMap');
      if (mapContainer && !this.map) {
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
      }
      this.updateMapMarkers();

      setTimeout(() => {
        this.map?.invalidateSize();
      }, 100);
    }, 100);
  }

  private updateMapMarkers() {
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
          color: 'var(--crayola-blue)',
          fillColor: 'var(--crayola-blue)',
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
