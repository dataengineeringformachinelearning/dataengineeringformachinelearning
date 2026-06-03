import { Component, OnInit, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EndpointsChart } from '../../components/endpoints-chart/endpoints-chart';
import { EndpointsTable } from '../../components/endpoints-table/endpoints-table';
import { MonitorService, EndpointData } from '../../services/monitor.service';
import { ModelService, TrainingResponse } from '../../services/model.service';
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
    MatProgressSpinnerModule
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private monitorService = inject(MonitorService);
  private modelService = inject(ModelService);
  public authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  
  allEndpoints: EndpointData[] = [];
  filteredEndpoints: EndpointData[] = [];

  isTraining = false;
  latestStat: number | null = null;
  trainError: string | null = null;

  ngOnInit() {
    this.monitorService.getAllEndpoints().subscribe({
      next: (data) => {
        this.allEndpoints = data;
        this.filteredEndpoints = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching data:', err)
    });

    this.fetchLatestStat();
  }

  fetchLatestStat() {
    this.modelService.getLatestTraining().subscribe({
      next: (data) => {
        if (data.average_sla !== null && data.average_sla !== undefined) {
          this.latestStat = data.average_sla;
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('Error fetching latest training stat:', err)
    });
  }

  trainModel() {
    this.isTraining = true;
    this.trainError = null;

    this.modelService.trainModel().subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          setTimeout(() => {
            console.log('Train model response:', res);
            this.isTraining = false;
            if (res && res.average_sla !== null && res.average_sla !== undefined) {
              this.latestStat = res.average_sla;
            }
            this.cdr.detectChanges();
          }, 500);
        });
      },
      error: (err) => {
        this.ngZone.run(() => {
          setTimeout(() => {
            console.error('Train model error:', err);
            this.isTraining = false;
            this.trainError = 'Failed to train model.';
            this.cdr.detectChanges();
          }, 500);
        });
      }
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
