import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AgCharts } from 'ag-charts-angular';
import { AgChartOptions } from 'ag-charts-community';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, AgCharts],
  templateUrl: './analytics.html',
  styleUrls: ['./analytics.scss'],
})
export class AnalyticsComponent implements OnInit {
  private http = inject(HttpClient);

  public p99Latency = 0;
  public uptimePercent = 0;
  public totalRequests = 0;
  public activeIncidents = 0;
  public isLoading = true;

  public chartOptions: AgChartOptions = {
    title: { text: 'System Latency (Last 24h)' },
    data: [],
    series: [
      {
        type: 'line',
        xKey: 'time',
        yKey: 'latency',
        yName: 'Latency (ms)',
        stroke: '#3b82f6',
        marker: { fill: '#3b82f6', stroke: '#2563eb' },
      },
    ],
    axes: [
      { type: 'category', position: 'bottom', title: { text: 'Time' } },
      { type: 'number', position: 'left', title: { text: 'Milliseconds' } },
    ],
    background: { fill: 'transparent' },
  };

  ngOnInit() {
    this.http.get<any>('/api/v1/analytics/overview').subscribe({
      next: response => {
        if (response.status === 'success' && response.data) {
          const data = response.data;
          this.p99Latency = data.p99_latency_ms;
          this.uptimePercent = data.uptime_percent;
          this.totalRequests = data.total_requests_24h;
          this.activeIncidents = data.active_incidents;

          this.chartOptions = {
            ...this.chartOptions,
            data: data.time_series,
          };
        }
        this.isLoading = false;
      },
      error: err => {
        console.error('Failed to load analytics data', err);
        this.isLoading = false;
      },
    });
  }
}
