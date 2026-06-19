import {
  Component,
  OnInit,
  inject,
  effect,
  afterNextRender,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AgCharts } from 'ag-charts-angular';
import { AgChartOptions } from 'ag-charts-community';
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

  public chartOptions: AgChartOptions = {
    title: {
      text: 'System Latency (Last 24h)',
      color: 'var(--text-color)',
      fontFamily: 'Inter, sans-serif',
    },
    data: [],
    series: [
      {
        type: 'area',
        xKey: 'time',
        yKey: 'latency',
        yName: 'Latency (ms)',
        fill: 'var(--color-success)',
        fillOpacity: 0.15,
        stroke: 'var(--color-success)',
        strokeWidth: 2,
        marker: {
          fill: 'var(--color-surface)',
          stroke: 'var(--color-success)',
          strokeWidth: 2,
          size: 4,
        },
      },
    ],
    axes: [
      {
        type: 'category',
        position: 'bottom',
        title: { text: 'Time', color: 'var(--text-muted)' },
        label: { color: 'var(--text-muted)' },
        line: { color: 'var(--border)' },
      },
      {
        type: 'number',
        position: 'left',
        title: { text: 'Milliseconds', color: 'var(--text-muted)' },
        label: { color: 'var(--text-muted)' },
        line: { color: 'var(--border)' },
        gridLine: { style: [{ stroke: 'var(--border)' }] },
      },
    ] as any,
    background: { fill: 'transparent' },
  };

  public originChartOptions: AgChartOptions = {
    data: [],
    series: [
      {
        type: 'donut',
        angleKey: 'count',
        calloutLabelKey: 'origin',
        sectorLabelKey: 'count',
        innerRadiusRatio: 0.6,
        calloutLabel: { color: 'var(--text-color)' },
        sectorLabel: { color: 'var(--color-surface)', fontWeight: 'bold' },
      },
    ],
    title: {
      text: 'Geographic Origins',
      color: 'var(--text-color)',
      fontFamily: 'Inter, sans-serif',
    },
    background: { fill: 'transparent' },
  };

  public frequencyChartOptions: AgChartOptions = {
    data: [],
    series: [
      {
        type: 'area',
        xKey: 'time',
        yKey: 'requests',
        fill: 'var(--color-primary)',
        fillOpacity: 0.15,
        stroke: 'var(--color-primary)',
        strokeWidth: 2,
        marker: {
          fill: 'var(--color-surface)',
          stroke: 'var(--color-primary)',
          strokeWidth: 2,
          size: 4,
        },
      },
    ],
    title: {
      text: 'Request Frequency',
      color: 'var(--text-color)',
      fontFamily: 'Inter, sans-serif',
    },
    axes: [
      {
        type: 'category',
        position: 'bottom',
        label: { color: 'var(--text-muted)' },
        line: { color: 'var(--border)' },
      },
      {
        type: 'number',
        position: 'left',
        label: { color: 'var(--text-muted)' },
        line: { color: 'var(--border)' },
        gridLine: { style: [{ stroke: 'var(--border)' }] },
      },
    ] as any,
    background: { fill: 'transparent' },
  };

  public statusChartOptions: AgChartOptions = {
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
    },
    axes: [
      {
        type: 'category',
        position: 'bottom',
        label: { color: 'var(--text-muted)' },
        line: { color: 'var(--border)' },
      },
      {
        type: 'number',
        position: 'left',
        label: { color: 'var(--text-muted)' },
        line: { color: 'var(--border)' },
        gridLine: { style: [{ stroke: 'var(--border)' }] },
      },
    ] as any,
    background: { fill: 'transparent' },
  };

  public endpointChartOptions: AgChartOptions = {
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
    },
    axes: [
      {
        type: 'category',
        position: 'bottom',
        label: { color: 'var(--text-muted)' },
        line: { color: 'var(--border)' },
      },
      {
        type: 'number',
        position: 'left',
        label: { color: 'var(--text-muted)' },
        line: { color: 'var(--border)' },
        gridLine: { style: [{ stroke: 'var(--border)' }] },
      },
    ] as any,
    background: { fill: 'transparent' },
  };

  public threatSeverityChartOptions: AgChartOptions = {
    data: [],
    series: [
      {
        type: 'donut',
        angleKey: 'count',
        calloutLabelKey: 'severity',
        innerRadiusRatio: 0.7,
        calloutLabel: { color: 'var(--text-color)' },
        sectorLabel: { color: 'var(--color-surface)', fontWeight: 'bold' },
      },
    ],
    title: {
      text: 'Threat Events by Severity',
      color: 'var(--text-color)',
      fontFamily: 'Inter, sans-serif',
    },
    background: { fill: 'transparent' },
  };

  public securityAlertsChartOptions: AgChartOptions = {
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
    },
    axes: [
      {
        type: 'category',
        position: 'bottom',
        label: { color: 'var(--text-muted)' },
        line: { color: 'var(--border)' },
      },
      {
        type: 'number',
        position: 'left',
        label: { color: 'var(--text-muted)' },
        line: { color: 'var(--border)' },
        gridLine: { style: [{ stroke: 'var(--border)' }] },
      },
    ] as any,
    background: { fill: 'transparent' },
  };

  constructor() {
    effect(() => {
      const activeTheme = this.themeService.theme();
      this.updateChartTheme(activeTheme);
    });

    // Ensure the page renders immediately (with the skeleton loader visible)
    // and only fetch data in the browser environment.
    afterNextRender(() => {
      this.loadAnalyticsData();
    });
  }

  private updateChartTheme(theme: 'light' | 'dark') {
    // The chart now directly uses CSS variables mapped to the current theme.
    // We retain this method in case we need to trigger an explicit redraw or handle specific non-CSS configurable properties.
    this.chartOptions = {
      ...this.chartOptions,
    };
  }

  ngOnInit() {
    // ngOnInit remains empty; data is loaded purely on the client side via afterNextRender.
  }

  private calculateCESMetrics() {
    // Simulate/Calculate gauge values based on telemetry
    // Threat Level: based on incidents and latency spikes (0-100, lower is better, but gauge usually shows high as bad)
    // We will invert it for a "health" gauge if needed, but let's say Threat is a 0-100% danger scale.
    this.threatLevel = Math.min(100, this.activeIncidents * 20 + (this.p99Latency > 500 ? 30 : 0));

    // SLA Level: essentially uptime and performance bounds.
    this.slaLevel = Math.max(0, this.uptimePercent - (this.p99Latency > 800 ? 5 : 0));

    // Stability Level: based on steady latency.
    this.stabilityLevel = Math.max(
      0,
      100 - this.activeIncidents * 10 - (this.p99Latency > 300 ? 15 : 0),
    );

    // Overall CES Level: A weighted average, representing Countermeasure Effectiveness Standard
    // High CES is good (100 is perfect).
    this.cesLevel = Math.max(
      0,
      Math.min(
        100,
        this.slaLevel * 0.5 + this.stabilityLevel * 0.4 + (100 - this.threatLevel) * 0.1,
      ),
    );
  }

  // Helper method to calculate the SVG dash array for the gauges
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
        // Fallback for visual demo if API fails
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
