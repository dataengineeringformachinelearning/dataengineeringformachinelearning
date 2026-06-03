import { Component, PLATFORM_ID, inject, Input, OnChanges, SimpleChanges } from '@angular/core';
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
  styleUrl: './endpoints-chart.scss'
})
export class EndpointsChart implements OnChanges {
  @Input() data: EndpointData[] = [];

  public chartOptions: AgChartOptions;
  public isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    if (this.isBrowser) {
      ModuleRegistry.registerModules([AllCommunityModule]);
    }
    this.chartOptions = {
      background: { fill: 'transparent' },
      data: [],
      series: [{
        type: 'line',
        xKey: 'time',
        yKey: 'statusCode',
        yName: 'Status Code',
        stroke: '#9fb8ad',
        strokeWidth: 3,
        marker: {
          fill: '#183a37',
          stroke: '#9fb8ad',
          size: 6,
          strokeWidth: 2
        }
      }],
      axes: {
        x: {
          type: 'category',
          gridLine: { style: [{ stroke: 'rgba(255, 255, 255, 0.2)' }] },
          label: { color: '#ffffff', fontFamily: 'Work Sans, sans-serif' },
          line: { stroke: 'rgba(255, 255, 255, 0.4)' }
        },
        y: {
          type: 'number',
          title: { text: 'Status Code', color: '#ffffff', fontFamily: 'Work Sans, sans-serif' },
          gridLine: { style: [{ stroke: 'rgba(255, 255, 255, 0.2)' }] },
          label: { color: '#ffffff', fontFamily: 'Work Sans, sans-serif' },
          line: { stroke: 'rgba(255, 255, 255, 0.4)' }
        }
      }
    } as any;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data'] && this.data) {
      this.updateChartData();
    }
  }

  private updateChartData() {
    const sortedData = [...this.data].sort((a, b) => new Date(a.last_tested).getTime() - new Date(b.last_tested).getTime());
    
    const formattedData = sortedData.map(endpoint => ({
      time: new Date(endpoint.last_tested).toLocaleTimeString(),
      statusCode: endpoint.status_code,
      url: endpoint.url
    }));

    this.chartOptions = {
      ...this.chartOptions,
      data: formattedData
    } as any;
  }
}
