import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MonitorService, StatusPageData } from '../../services/monitor.service';
import { ModelService } from '../../services/model.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RouterModule
  ],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private monitorService = inject(MonitorService);
  public modelService = inject(ModelService);

  statusPages = signal<StatusPageData[]>([]);

  ngOnInit() {
    this.monitorService.getStatusPages().subscribe({
      next: data => {
        this.statusPages.set(data);
      },
      error: err => console.error('Error fetching pages:', err),
    });

    this.modelService.fetchLatestStat();
  }
}
