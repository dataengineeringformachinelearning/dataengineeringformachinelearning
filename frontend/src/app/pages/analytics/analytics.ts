import {
  Component,
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
export class AnalyticsComponent {
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
        stroke: 'var(--crayola-blue)',
        strokeWidth: 3,
        fill: 'var(--crayola-blue)',
        fillOpacity: 0.15,
        interpolation: { type: 'smooth' },
        marker: {
          enabled: true,
          size: 0, // hide by default
        },
        shadow: {
          color: 'var(--crayola-blue)',
          xOffset: 0,
          yOffset: 0,
          blur: 4,
        },
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
        label: { color: 'var(--text-muted)', fontSize: 11, fontWeight: '600' },
        line: { width: 0 },
        tick: { size: 0 },
      },
      {
        type: 'number',
        position: 'left',
        label: { color: 'var(--text-muted)', fontSize: 11, fontWeight: '600' },
        line: { width: 0 },
        tick: { size: 0 },
        gridLine: { style: [{ stroke: 'rgba(255, 255, 255, 0.04)', lineDash: [4, 4] }] },
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
        shadow: {
          color: 'var(--color-primary-container)',
          xOffset: 0,
          yOffset: 0,
          blur: 10,
        },
        fills: [
          'var(--color-info)',
          'var(--color-primary)',
          'var(--color-success)',
          'var(--crayola-blue)',
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
        stroke: 'var(--color-info)',
        strokeWidth: 3,
        fill: 'var(--color-info)',
        fillOpacity: 0.15,
        interpolation: { type: 'smooth' },
        marker: {
          enabled: true,
          size: 0,
        },
        shadow: {
          color: 'var(--color-info)',
          xOffset: 0,
          yOffset: 0,
          blur: 4,
        },
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
        label: { color: 'var(--text-muted)', fontSize: 11, fontWeight: '600', rotation: 45 },
        line: { width: 0 },
        tick: { size: 0 },
      },
      {
        type: 'number',
        position: 'left',
        label: { color: 'var(--text-muted)', fontSize: 11, fontWeight: '600' },
        line: { width: 0 },
        tick: { size: 0 },
        gridLine: { style: [{ stroke: 'rgba(255, 255, 255, 0.04)', lineDash: [4, 4] }] },
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
        fill: 'var(--crayola-blue)',
        strokeWidth: 0,
        cornerRadius: 4,
        maxBarWidth: 32,
        shadow: {
          color: 'var(--crayola-blue)',
          xOffset: 0,
          yOffset: 0,
          blur: 12,
        },
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
        label: { color: 'var(--text-muted)', fontSize: 11, fontWeight: '600' },
        line: { width: 0 },
        tick: { size: 0 },
      },
      {
        type: 'number',
        position: 'left',
        label: { color: 'var(--text-muted)', fontSize: 11, fontWeight: '600' },
        line: { width: 0 },
        tick: { size: 0 },
        gridLine: { style: [{ stroke: 'rgba(255, 255, 255, 0.04)', lineDash: [4, 4] }] },
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
        fill: 'var(--crayola-blue)',
        strokeWidth: 0,
        cornerRadius: 4,
        maxBarWidth: 32,
        shadow: {
          color: 'var(--crayola-blue)',
          xOffset: 0,
          yOffset: 0,
          blur: 12,
        },
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
        label: { color: 'var(--text-muted)', fontSize: 11, fontWeight: '600' },
        line: { width: 0 },
        tick: { size: 0 },
      },
      {
        type: 'number',
        position: 'left',
        label: { color: 'var(--text-muted)', fontSize: 11, fontWeight: '600' },
        line: { width: 0 },
        tick: { size: 0 },
        gridLine: { style: [{ stroke: 'rgba(255, 255, 255, 0.04)', lineDash: [4, 4] }] },
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
        shadow: {
          color: 'var(--color-error)',
          xOffset: 0,
          yOffset: 0,
          blur: 10,
        },
        fills: [
          'var(--color-error)',
          'var(--color-gauge-red)',
          'var(--color-warning)',
          'var(--crayola-blue)',
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
        maxBarWidth: 32,
        shadow: {
          color: 'var(--color-error)',
          xOffset: 0,
          yOffset: 0,
          blur: 12,
        },
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
        label: { color: 'var(--text-muted)', fontSize: 11, fontWeight: '600', rotation: 45 },
        line: { width: 0 },
        tick: { size: 0 },
      },
      {
        type: 'number',
        position: 'left',
        label: { color: 'var(--text-muted)', fontSize: 11, fontWeight: '600' },
        line: { width: 0 },
        tick: { size: 0 },
        gridLine: { style: [{ stroke: 'rgba(255, 255, 255, 0.04)', lineDash: [4, 4] }] },
      },
    ],
    background: { fill: 'transparent' },
  };

  get isDarkMode(): boolean {
    return this.themeService.theme() === 'dark';
  }

  constructor() {
    if (this.isBrowser && !AnalyticsComponent.modulesRegistered) {
      ModuleRegistry.registerModules([AllCommunityModule]);
      AnalyticsComponent.modulesRegistered = true;
    }

    effect(() => {
      this.themeService.theme(); // depend on signal
      this.updateChartTheme();
    });

    afterNextRender(() => {
      this.loadAnalyticsData();
    });
  }

  private updateChartTheme() {
    const themeColors = {
      text: this.isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(15, 23, 42, 0.5)',
      grid: this.isDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.06)',
      barFill: this.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.05)',
      tooltipBg: this.isDarkMode ? '#16171D' : '#FFFFFF',
      tooltipBorder: this.isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      tooltipText: this.isDarkMode ? '#FFFFFF' : '#0F172A',
      titleColor: this.isDarkMode ? '#FFFFFF' : '#0F172A',
      donutStroke: this.isDarkMode ? '#16171D' : '#FFFFFF',
      errorFill: 'var(--color-error)',
    };

    const getBaseOptions = (title: string, data: any[]) => ({
      data,
      background: { fill: 'transparent' },
      autoSize: true,
      padding: { top: 20, right: 20, bottom: 20, left: 20 },
      title: {
        text: title,
        color: themeColors.titleColor,
        fontFamily: 'Inter, sans-serif',
        fontSize: 16,
        fontWeight: 600,
      },
      tooltip: {
        enabled: true,
        renderer: (params: any) => {
          let xValue = params.xValue;
          let yValue = params.yValue;

          // Handle donut charts
          if (xValue === undefined && params.datum) {
            xValue = params.datum[params.calloutLabelKey] || '';
            yValue = params.datum[params.angleKey] || 0;
          }

          const yFormatted = typeof yValue === 'number' ? yValue.toFixed(2) : yValue;
          return {
            backgroundColor: themeColors.tooltipBg,
            content: `<div style="padding: 8px; border: 1px solid ${themeColors.tooltipBorder}; border-radius: 8px; color: ${themeColors.tooltipText}; font-family: Inter, sans-serif; font-size: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                        <span style="color: ${themeColors.text}; font-size: 10px;">${xValue}</span><br/>
                        <strong>${yFormatted}</strong>
                      </div>`,
          };
        },
      },
    });

    const getAxes = (xRotation = 0) => [
      {
        type: 'category',
        position: 'bottom',
        line: { enabled: false },
        tick: { enabled: false },
        label: {
          color: themeColors.text,
          fontSize: 11,
          fontFamily: 'Inter, sans-serif',
          rotation: xRotation,
        },
        gridStyle: [{ stroke: 'transparent' }],
      },
      {
        type: 'number',
        position: 'left',
        line: { enabled: false },
        tick: { enabled: false },
        label: {
          color: themeColors.text,
          fontSize: 11,
          fontFamily: 'Inter, sans-serif',
        },
        gridStyle: [
          {
            stroke: themeColors.grid,
            lineDash: [4, 4],
          },
        ],
      },
    ];

    this.chartOptions = {
      ...getBaseOptions('System Latency (Last 24h)', this.chartOptions.data),
      axes: getAxes(0),
      series: [
        {
          type: 'area',
          xKey: 'time',
          yKey: 'latency',
          stroke: '#3b82f6',
          strokeWidth: 2,
          fillOpacity: this.isDarkMode ? 0.12 : 0.08,
          marker: {
            enabled: false,
            activeShape: 'circle',
            size: 5,
            fill: '#3b82f6',
            strokeWidth: 0,
          },
        },
      ],
    } as any;

    this.originChartOptions = {
      ...getBaseOptions('Geographic Origins', this.originChartOptions.data),
      series: [
        {
          type: 'donut',
          angleKey: 'count',
          calloutLabelKey: 'origin',
          sectorLabelKey: 'count',
          innerRadiusRatio: 0.7,
          calloutLabel: { color: themeColors.text, fontFamily: 'Inter, sans-serif', fontSize: 11 },
          sectorLabel: { color: themeColors.donutStroke, fontWeight: 'bold' },
          strokes: [themeColors.donutStroke],
          strokeWidth: 2,
          fills: [
            'var(--color-info)',
            'var(--color-primary)',
            'var(--color-success)',
            '#3b82f6',
            'var(--color-warning)',
          ],
        },
      ],
    } as any;

    this.frequencyChartOptions = {
      ...getBaseOptions('Request Frequency', this.frequencyChartOptions.data),
      axes: getAxes(45),
      series: [
        {
          type: 'area',
          xKey: 'time',
          yKey: 'requests',
          stroke: 'var(--color-info)',
          strokeWidth: 2,
          fillOpacity: this.isDarkMode ? 0.12 : 0.08,
          marker: {
            enabled: false,
            activeShape: 'circle',
            size: 5,
            fill: 'var(--color-info)',
            strokeWidth: 0,
          },
        },
      ],
    } as any;

    this.statusChartOptions = {
      ...getBaseOptions('HTTP Status Distribution', this.statusChartOptions.data),
      axes: getAxes(0),
      series: [
        {
          type: 'bar',
          xKey: 'status',
          yKey: 'count',
          fill: themeColors.barFill,
          strokeWidth: 0,
          cornerRadius: 4,
          maxBarWidth: 32,
        },
      ],
    } as any;

    this.endpointChartOptions = {
      ...getBaseOptions('Request Counts per Endpoint', this.endpointChartOptions.data),
      axes: getAxes(0),
      series: [
        {
          type: 'bar',
          xKey: 'endpoint',
          yKey: 'count',
          fill: themeColors.barFill,
          strokeWidth: 0,
          cornerRadius: 4,
          maxBarWidth: 32,
        },
      ],
    } as any;

    this.threatSeverityChartOptions = {
      ...getBaseOptions('Threat Events by Severity', this.threatSeverityChartOptions.data),
      series: [
        {
          type: 'donut',
          angleKey: 'count',
          calloutLabelKey: 'severity',
          innerRadiusRatio: 0.75,
          calloutLabel: { color: themeColors.text, fontFamily: 'Inter, sans-serif', fontSize: 11 },
          sectorLabel: { color: themeColors.donutStroke, fontWeight: 'bold' },
          strokes: [themeColors.donutStroke],
          strokeWidth: 2,
          fills: [
            'var(--color-error)',
            'var(--color-gauge-red)',
            'var(--color-warning)',
            '#3b82f6',
          ],
        },
      ],
    } as any;

    this.securityAlertsChartOptions = {
      ...getBaseOptions('Recent Security Anomalies', this.securityAlertsChartOptions.data),
      axes: getAxes(45),
      series: [
        {
          type: 'bar',
          xKey: 'time',
          yKey: 'count',
          fill: themeColors.errorFill,
          strokeWidth: 0,
          cornerRadius: 4,
          maxBarWidth: 32,
        },
      ],
    } as any;
  }

  private calculateCESMetrics() {
    // Note: CES is now securely calculated on the backend to prevent cross-tenant data leakage.
    // The frontend merely displays the pre-calculated global math aggregate values.
  }

  public getGaugeStroke(value: number, circumference: number): string {
    const dash = (value / 100) * circumference;
    return `${dash} ${circumference}`;
  }

  private loadAnalyticsData() {
    this.http.get<any>(`${environment.backendUrl}/api/v1/analytics/overview`).subscribe({
      next: response => {
        if (response.status === 'success' && response.data) {
          const { ces, user_metrics } = response.data;

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

          this.chartOptions = {
            ...this.chartOptions,
            data: user_metrics?.time_series || [],
          };
          this.originChartOptions = {
            ...this.originChartOptions,
            data: user_metrics?.origin_distribution || [],
          };
          this.frequencyChartOptions = {
            ...this.frequencyChartOptions,
            data: user_metrics?.request_frequency || [],
          };
          this.statusChartOptions = {
            ...this.statusChartOptions,
            data: user_metrics?.http_statuses || [],
          };
          this.endpointChartOptions = {
            ...this.endpointChartOptions,
            data: user_metrics?.endpoint_counts || [],
          };
          this.threatSeverityChartOptions = {
            ...this.threatSeverityChartOptions,
            data: user_metrics?.threat_severity || [],
          };
          this.securityAlertsChartOptions = {
            ...this.securityAlertsChartOptions,
            data: user_metrics?.security_alerts || [],
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
        this.widgetInteractions = 0;
        this.uniqueVisitors = 0;
        this.cookieConsents = 0;
        this.activeProviders = [];
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
