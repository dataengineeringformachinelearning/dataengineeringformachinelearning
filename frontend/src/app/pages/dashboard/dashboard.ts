import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AgCharts } from 'ag-charts-angular';
import { AgChartOptions, ModuleRegistry, AllCommunityModule } from 'ag-charts-community';
import { MonitorService } from '../../services/monitor.service';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [AgCharts, MatCardModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  public chartOptions: AgChartOptions;
  private monitorService = inject(MonitorService);
  public isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    if (this.isBrowser) {
      ModuleRegistry.registerModules([AllCommunityModule]);
    }
    this.chartOptions = {
      title: { text: "Application Stability" },
      data: [],
      series: [{
        type: 'line',
        xKey: 'time',
        yKey: 'statusCode',
        yName: 'Status Code',
      }],
    };
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
        };
      });
    }
  }
}
