import {
  Component,
  OnInit,
  inject,
  effect,
  afterNextRender,
  ChangeDetectorRef,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AgCharts } from 'ag-charts-angular';
import { AgChartOptions, ModuleRegistry, AllCommunityModule } from 'ag-charts-community';
import { MatIconModule } from '@angular/material/icon';
import { ThemeService } from '../../services/theme.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, AgCharts, MatIconModule],
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
  public isLoading = true;

  // CES Meter Metrics
  public cesLevel = 0;
  public threatLevel = 0;
  public slaLevel = 0;
  public stabilityLevel = 0;

  private static modulesRegistered = false;

  public chartOptions: any = {
    title: {
      text: 'System Latency (Last 24h)',
      color: 'var(--text-color)',
      fontFamily: 'Inter, sans-serif',
      fontSize: 16,
      fontWeight: 600,
    },
    data: [],
    series: [
      {
        type: 'area',
        xKey: 'time',
        yKey: 'latency',
        yName: 'Latency (ms)',
        fill: 'var(--color-amber)',
        fillOpacity: 0.2,
        stroke: 'var(--color-amber)',
        strokeWidth: 2,
        interpolation: { type: 'smooth' },
        marker: { enabled: false },
        tooltip: {
          renderer: (params: any) => ({
            content: `${params.yValue.toFixed(2)} ms`,
          }),
        },
      },
    ],
    axes: [
      {
        type: 'category',
        position: 'bottom',
        label: { color: 'var(--text-muted)' },
        line: { width: 0 },
        tick: { size: 0 },
      },
      {
        type: 'number',
        position: 'left',
        label: { color: 'var(--text-muted)' },
        line: { width: 0 },
        tick: { size: 0 },
        gridLine: { style: [{ stroke: 'var(--border)', lineDash: [4, 4] }] },
      },
    ],
    background: { fill: 'transparent' },
  };

  public originChartOptions: any = {
    data: [],
    series: [
      {
        type: 'donut',
        angleKey: 'count',
        calloutLabelKey: 'origin',
        sectorLabelKey: 'count',
        innerRadiusRatio: 0.7,
        calloutLabel: { color: 'var(--text-color)' },
        sectorLabel: { color: 'var(--color-surface)', fontWeight: 'bold' },
        strokes: ['var(--color-surface)'],
        strokeWidth: 2,
        fills: [
          'var(--color-info)',
          'var(--color-primary)',
          'var(--color-success)',
          'var(--color-amber)',
          'var(--color-warning)',
        ],
      },
    ],
    title: {
      text: 'Geographic Origins',
      color: 'var(--text-color)',
      fontFamily: 'Inter, sans-serif',
      fontSize: 16,
      fontWeight: 600,
    },
    background: { fill: 'transparent' },
  };

  public frequencyChartOptions: any = {
    data: [],
    series: [
      {
        type: 'area',
        xKey: 'time',
        yKey: 'requests',
        fill: 'var(--color-info)',
        fillOpacity: 0.2,
        stroke: 'var(--color-info)',
        strokeWidth: 2,
        interpolation: { type: 'smooth' },
        marker: { enabled: false },
        tooltip: {
          renderer: (params: any) => ({
            content: `${params.yValue} requests`,
          }),
        },
      },
    ],
    title: {
      text: 'Request Frequency',
      color: 'var(--text-color)',
      fontFamily: 'Inter, sans-serif',
      fontSize: 16,
      fontWeight: 600,
    },
    axes: [
      {
        type: 'category',
        position: 'bottom',
        label: { color: 'var(--text-muted)' },
        line: { width: 0 },
        tick: { size: 0 },
      },
      {
        type: 'number',
        position: 'left',
        label: { color: 'var(--text-muted)' },
        line: { width: 0 },
        tick: { size: 0 },
        gridLine: { style: [{ stroke: 'var(--border)', lineDash: [4, 4] }] },
      },
    ],
    background: { fill: 'transparent' },
  };

  public statusChartOptions: any = {
    data: [],
    series: [
      {
        type: 'bar',
        xKey: 'status',
        yKey: 'count',
        fill: 'var(--color-warning)',
        strokeWidth: 0,
        cornerRadius: 4,
      },
    ],
    title: {
      text: 'HTTP Status Distribution',
      color: 'var(--text-color)',
      fontFamily: 'Inter, sans-serif',
      fontSize: 16,
      fontWeight: 600,
    },
    axes: [
      {
        type: 'category',
        position: 'bottom',
        label: { color: 'var(--text-muted)' },
        line: { width: 0 },
        tick: { size: 0 },
      },
      {
        type: 'number',
        position: 'left',
        label: { color: 'var(--text-muted)' },
        line: { width: 0 },
        tick: { size: 0 },
        gridLine: { style: [{ stroke: 'var(--border)', lineDash: [4, 4] }] },
      },
    ],
    background: { fill: 'transparent' },
  };

  public endpointChartOptions: any = {
    data: [],
    series: [
      {
        type: 'bar',
        xKey: 'endpoint',
        yKey: 'count',
        fill: 'var(--color-success)',
        strokeWidth: 0,
        cornerRadius: 4,
      },
    ],
    title: {
      text: 'Request Counts per Endpoint',
      color: 'var(--text-color)',
      fontFamily: 'Inter, sans-serif',
      fontSize: 16,
      fontWeight: 600,
    },
    axes: [
      {
        type: 'category',
        position: 'bottom',
        label: { color: 'var(--text-muted)' },
        line: { width: 0 },
        tick: { size: 0 },
      },
      {
        type: 'number',
        position: 'left',
        label: { color: 'var(--text-muted)' },
        line: { width: 0 },
        tick: { size: 0 },
        gridLine: { style: [{ stroke: 'var(--border)', lineDash: [4, 4] }] },
      },
    ],
    background: { fill: 'transparent' },
  };

  public threatSeverityChartOptions: any = {
    data: [],
    series: [
      {
        type: 'donut',
        angleKey: 'count',
        calloutLabelKey: 'severity',
        innerRadiusRatio: 0.75,
        calloutLabel: { color: 'var(--text-color)' },
        sectorLabel: { color: 'var(--color-surface)', fontWeight: 'bold' },
        strokes: ['var(--color-surface)'],
        strokeWidth: 2,
        fills: [
          'var(--color-error)',
          'var(--color-gauge-red)',
          'var(--color-warning)',
          'var(--color-amber)',
        ],
      },
    ],
    title: {
      text: 'Threat Events by Severity',
      color: 'var(--text-color)',
      fontFamily: 'Inter, sans-serif',
      fontSize: 16,
      fontWeight: 600,
    },
    background: { fill: 'transparent' },
  };

  public securityAlertsChartOptions: any = {
    data: [],
    series: [
      {
        type: 'bar',
        xKey: 'time',
        yKey: 'count',
        fill: 'var(--color-error)',
        strokeWidth: 0,
        cornerRadius: 4,
      },
    ],
    title: {
      text: 'Recent Security Anomalies',
      color: 'var(--text-color)',
      fontFamily: 'Inter, sans-serif',
      fontSize: 16,
      fontWeight: 600,
    },
    axes: [
      {
        type: 'category',
        position: 'bottom',
        label: { color: 'var(--text-muted)' },
        line: { width: 0 },
        tick: { size: 0 },
      },
      {
        type: 'number',
        position: 'left',
        label: { color: 'var(--text-muted)' },
        line: { width: 0 },
        tick: { size: 0 },
        gridLine: { style: [{ stroke: 'var(--border)', lineDash: [4, 4] }] },
      },
    ],
    background: { fill: 'transparent' },
  };

  constructor() {
    if (this.isBrowser && !AnalyticsComponent.modulesRegistered) {
      ModuleRegistry.registerModules([AllCommunityModule]);
      AnalyticsComponent.modulesRegistered = true;
    }

    effect(() => {
      const activeTheme = this.themeService.theme();
      this.updateChartTheme(activeTheme);
    });

    afterNextRender(() => {
      this.loadAnalyticsData();
    });
  }

  private updateChartTheme(theme: 'light' | 'dark') {
    this.chartOptions = { ...this.chartOptions };
  }

  ngOnInit() {}

  private calculateCESMetrics() {
    this.threatLevel = Math.min(100, this.activeIncidents * 20 + (this.p99Latency > 500 ? 30 : 0));
    this.slaLevel = Math.max(0, this.uptimePercent - (this.p99Latency > 800 ? 5 : 0));
    this.stabilityLevel = Math.max(
      0,
      100 - this.activeIncidents * 10 - (this.p99Latency > 300 ? 15 : 0),
    );
    this.cesLevel = Math.max(
      0,
      Math.min(
        100,
        this.slaLevel * 0.5 + this.stabilityLevel * 0.4 + (100 - this.threatLevel) * 0.1,
      ),
    );
  }

  public getGaugeStroke(value: number, circumference: number): string {
    const dash = (value / 100) * circumference;
    return `${dash} ${circumference}`;
  }

  private loadAnalyticsData() {
    this.http.get<any>(`${environment.backendUrl}/api/v1/analytics/overview`).subscribe({
      next: response => {
        if (response.status === 'success' && response.data) {
          const data = response.data;
          this.p99Latency = data.p99_latency_ms;
          this.uptimePercent = data.uptime_percent;
          this.totalRequests = data.total_requests_24h;
          this.activeIncidents = data.active_incidents;

          this.calculateCESMetrics();

          this.chartOptions = {
            ...this.chartOptions,
            data: data.time_series || [],
          };
          this.originChartOptions = {
            ...this.originChartOptions,
            data: data.origin_distribution || [],
          };
          this.frequencyChartOptions = {
            ...this.frequencyChartOptions,
            data: data.request_frequency || [],
          };
          this.statusChartOptions = { ...this.statusChartOptions, data: data.http_statuses || [] };
          this.endpointChartOptions = {
            ...this.endpointChartOptions,
            data: data.endpoint_counts || [],
          };
          this.threatSeverityChartOptions = {
            ...this.threatSeverityChartOptions,
            data: data.threat_severity || [],
          };
          this.securityAlertsChartOptions = {
            ...this.securityAlertsChartOptions,
            data: data.security_alerts || [],
          };
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Failed to load analytics data', err);
        this.p99Latency = 0;
        this.uptimePercent = 0;
        this.totalRequests = 0;
        this.activeIncidents = 0;
        this.calculateCESMetrics();
        this.chartOptions = { ...this.chartOptions, data: [] };
        this.originChartOptions = { ...this.originChartOptions, data: [] };
        this.frequencyChartOptions = { ...this.frequencyChartOptions, data: [] };
        this.statusChartOptions = { ...this.statusChartOptions, data: [] };
        this.endpointChartOptions = { ...this.endpointChartOptions, data: [] };
        this.threatSeverityChartOptions = { ...this.threatSeverityChartOptions, data: [] };
        this.securityAlertsChartOptions = { ...this.securityAlertsChartOptions, data: [] };

        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }
}
