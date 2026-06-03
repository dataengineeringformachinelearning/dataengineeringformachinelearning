import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AgCharts } from 'ag-charts-angular';
import { AgChartOptions, ModuleRegistry, AllCommunityModule } from 'ag-charts-community';
import { MonitorService } from '../../services/monitor.service';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-stability-chart',
  standalone: true,
  imports: [AgCharts, MatCardModule],
  templateUrl: './stability-chart.html',
  styleUrl: './stability-chart.scss'
})
export class StabilityChart implements OnInit {
  public chartOptions: AgChartOptions;
  private monitorService = inject(MonitorService);
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
      axes: [
        {
          type: 'category',
          position: 'bottom',
          gridLine: { style: [{ stroke: 'rgba(150, 150, 150, 0.2)' }] },
          label: { color: '#9aa0a6', fontFamily: 'Work Sans, sans-serif' },
          line: { stroke: 'rgba(150, 150, 150, 0.2)' }
        },
        {
          type: 'number',
          position: 'left',
          gridLine: { style: [{ stroke: 'rgba(150, 150, 150, 0.2)' }] },
          label: { color: '#9aa0a6', fontFamily: 'Work Sans, sans-serif' },
          line: { stroke: 'rgba(150, 150, 150, 0.2)' }
        }
      ]
    } as any;
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.monitorService.getAllEndpoints().subscribe(data => {
        const sortedData = data.sort((a, b) => new Date(a.last_tested).getTime() - new Date(b.last_tested).getTime());
        
        const formattedData = sortedData.map(endpoint => ({
          time: new Date(endpoint.last_tested).toLocaleTimeString(),
          statusCode: endpoint.status_code,
          url: endpoint.url
        }));

        this.chartOptions = {
          ...this.chartOptions,
          data: formattedData
        } as any;
      });
    }
  }
}
