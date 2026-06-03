import { Component, OnInit, inject } from '@angular/core';
import { EndpointsChart } from '../../components/endpoints-chart/endpoints-chart';
import { EndpointsTable } from '../../components/endpoints-table/endpoints-table';
import { MonitorService, EndpointData } from '../../services/monitor.service';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [EndpointsChart, EndpointsTable, MatCardModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private monitorService = inject(MonitorService);
  
  allEndpoints: EndpointData[] = [];
  filteredEndpoints: EndpointData[] = [];

  ngOnInit() {
    this.monitorService.getAllEndpoints().subscribe({
      next: (data) => {
        this.allEndpoints = data;
        this.filteredEndpoints = data;
      },
      error: (err) => console.error('Error fetching data:', err)
    });
  }

  onSelectionChanged(selectedRows: EndpointData[]) {
    if (selectedRows.length === 0) {
      this.filteredEndpoints = this.allEndpoints;
    } else {
      this.filteredEndpoints = selectedRows;
    }
  }
}
