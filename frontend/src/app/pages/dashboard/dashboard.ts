import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EndpointsChart } from '../../components/endpoints-chart/endpoints-chart';
import { EndpointsTable } from '../../components/endpoints-table/endpoints-table';
import { MonitorService, EndpointData } from '../../services/monitor.service';
import { ModelService } from '../../services/model.service';
import { AuthService } from '../../services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    EndpointsChart,
    EndpointsTable,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private monitorService = inject(MonitorService);
  public modelService = inject(ModelService);
  public authService = inject(AuthService);

  allEndpoints = signal<EndpointData[]>([]);
  filteredEndpoints = signal<EndpointData[]>([]);

  ngOnInit() {
    this.monitorService.getAllEndpoints().subscribe({
      next: data => {
        this.allEndpoints.set(data);
        this.filteredEndpoints.set(data);
      },
      error: err => console.error('Error fetching data:', err),
    });

    this.modelService.fetchLatestStat();
  }

  trainModel() {
    this.modelService.trainModel();
  }

  onSelectionChanged(selectedRows: EndpointData[]) {
    if (selectedRows.length === 0) {
      this.filteredEndpoints.set(this.allEndpoints());
    } else {
      this.filteredEndpoints.set(selectedRows);
    }
  }
}
