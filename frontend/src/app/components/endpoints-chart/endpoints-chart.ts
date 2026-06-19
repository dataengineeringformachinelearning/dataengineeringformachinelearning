import {
  Component,
  PLATFORM_ID,
  inject,
  Input,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AgCharts } from 'ag-charts-angular';
import { AgChartOptions, ModuleRegistry, AllCommunityModule } from 'ag-charts-community';
import { MatCardModule } from '@angular/material/card';
import { EndpointData } from '../../services/monitor.service';

@Component({
  selector: 'app-endpoints-chart',
  standalone: true,
  imports: [AgCharts, MatCardModule],
  templateUrl: './endpoints-chart.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './endpoints-chart.scss',
})
export class EndpointsChart implements OnChanges {
  @Input() data: EndpointData[] = [];

  public chartOptions: AgChartOptions;
  public isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private static modulesRegistered = false;

  constructor() {
    if (this.isBrowser && !EndpointsChart.modulesRegistered) {
      ModuleRegistry.registerModules([AllCommunityModule]);
      EndpointsChart.modulesRegistered = true;
    }
    this.chartOptions = {
      background: { fill: 'transparent' },
      data: [],
      series: [
        {
          type: 'area',
          xKey: 'time',
          yKey: 'statusCode',
          yName: 'Status Code',
          fill: 'var(--color-primary)',
          fillOpacity: 0.15,
          stroke: 'var(--color-primary)',
          strokeWidth: 3,
          interpolation: { type: 'smooth' },
          marker: {
            enabled: false,
          },
        },
      ],
      axes: [
        {
          type: 'category',
          position: 'bottom',
          label: { color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' },
          line: { width: 0 },
          tick: { size: 0 },
        },
        {
          type: 'number',
          position: 'left',
          title: {
            text: 'Status Code',
            color: 'var(--text-muted)',
            fontFamily: 'Inter, sans-serif',
          },
          label: { color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif' },
          line: { width: 0 },
          tick: { size: 0 },
          gridLine: { style: [{ stroke: 'var(--border)', lineDash: [4, 4] }] },
        },
      ],
    } as any;
  }

  private cdr = inject(ChangeDetectorRef);

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] && this.data) {
      this.updateChartData();
      this.cdr.detectChanges();
    }
  }

  private updateChartData() {
    const sortedData = [...this.data].sort(
      (a, b) => new Date(a.last_tested).getTime() - new Date(b.last_tested).getTime(),
    );

    const formattedData = sortedData.map(endpoint => ({
      time: new Date(endpoint.last_tested).toLocaleTimeString(),
      statusCode: endpoint.status_code,
      url: endpoint.url,
    }));

    this.chartOptions = {
      ...this.chartOptions,
      data: formattedData,
    } as any;
  }
}
