import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  signal,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MonitorService, StatusPageData, IncidentData, MonitoredServiceData } from '../../services/monitor.service';
import { ModelService } from '../../services/model.service';
import { AuthService } from '../../services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { Sidebar } from '../../components/sidebar/sidebar';
import { StatusCta } from '../../components/status-cta/status-cta';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
    Sidebar,
    StatusCta
  ],
  templateUrl: './explore.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './explore.scss',
})
export class Explore implements OnInit {
  private monitorService = inject(MonitorService);
  public modelService = inject(ModelService);
  public authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  statusPages = signal<StatusPageData[]>([]);
  incidentsMap = signal<Record<string, IncidentData[]>>({});
  servicesMap = signal<Record<string, MonitoredServiceData[]>>({});

  ngOnInit() {
    this.monitorService.getStatusPages().subscribe({
      next: data => {
        // Under /explore we show all public status pages, including the main 'platform-status' system page
        this.statusPages.set(data);
        this.fetchAllIncidents(data);
        this.fetchAllServices(data);
        data.forEach(page => {
          this.modelService.fetchLatestStat(page.id);
        });
        this.cdr.markForCheck();
      },
      error: err => {
        console.error('Error fetching pages for explore:', err);
        this.cdr.markForCheck();
      },
    });
  }

  getPageStatus(pageId: string): string {
    const incs = this.incidentsMap()[pageId] || [];
    const active = incs.filter(i => i.status !== 'Resolved');
    if (active.length > 0) {
      return active[0].status;
    }
    return 'Operational';
  }

  getPageStatusClass(pageId: string): string {
    const status = this.getPageStatus(pageId);
    if (status === 'Operational') return 'operational';
    return status.toLowerCase();
  }

  fetchAllIncidents(pages: StatusPageData[]) {
    pages.forEach(page => {
      this.monitorService.getIncidents(page.id).subscribe({
        next: incidents => {
          this.incidentsMap.update(map => ({ ...map, [page.id]: incidents }));
          this.cdr.markForCheck();
        },
        error: err => console.error(`Error fetching incidents for ${page.id}:`, err)
      });
    });
  }

  fetchAllServices(pages: StatusPageData[]) {
    pages.forEach(page => {
      this.monitorService.getServices(page.id).subscribe({
        next: services => {
          this.servicesMap.update(map => ({ ...map, [page.id]: services }));
          this.cdr.markForCheck();
        },
        error: err => console.error(`Error fetching services for ${page.id}:`, err)
      });
    });
  }
}
