import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  signal,
  computed,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';
import { MonitorService, StatusPageData, IncidentData, MonitoredServiceData } from '../../services/monitor.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Sidebar implements OnInit {
  public authService = inject(AuthService);
  private monitorService = inject(MonitorService);
  private cdr = inject(ChangeDetectorRef);

  statusPages = signal<StatusPageData[]>([]);
  incidentsMap = signal<Record<string, IncidentData[]>>({});
  servicesMap = signal<Record<string, MonitoredServiceData[]>>({});

  globalStatus = computed(() => {
    const map = this.incidentsMap();
    for (const key of Object.keys(map)) {
      const active = map[key].filter(inc => inc.status !== 'Resolved');
      if (active.length > 0) {
        return 'Degraded Performance';
      }
    }

    const services = this.servicesMap();
    for (const key of Object.keys(services)) {
      const down = services[key].filter(s => s.status === 'Outage');
      if (down.length > 0) {
        return 'Degraded Performance';
      }
    }

    return 'All Systems Normal';
  });

  ngOnInit() {
    this.monitorService.getStatusPages().subscribe({
      next: data => {
        this.statusPages.set(data);
        this.fetchAllIncidents(data);
        this.fetchAllServices(data);
        this.cdr.markForCheck();
      },
      error: err => {
        console.error('Error fetching pages for sidebar:', err);
      }
    });
  }

  private fetchAllIncidents(pages: StatusPageData[]) {
    pages.forEach(page => {
      this.monitorService.getIncidents(page.id).subscribe({
        next: incidents => {
          this.incidentsMap.update(map => ({ ...map, [page.id]: incidents }));
          this.cdr.markForCheck();
        },
        error: err => console.error(`Error fetching incidents for ${page.id} in sidebar:`, err)
      });
    });
  }

  private fetchAllServices(pages: StatusPageData[]) {
    pages.forEach(page => {
      this.monitorService.getServices(page.id).subscribe({
        next: services => {
          this.servicesMap.update(map => ({ ...map, [page.id]: services }));
          this.cdr.markForCheck();
        },
        error: err => console.error(`Error fetching services for ${page.id} in sidebar:`, err)
      });
    });
  }
}
