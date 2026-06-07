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
import { MonitorService, StatusPageData, IncidentData } from '../../services/monitor.service';
import { ModelService } from '../../services/model.service';
import { AuthService } from '../../services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-status',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RouterModule
  ],
  templateUrl: './status.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './status.scss',
})
export class Status implements OnInit {
  private monitorService = inject(MonitorService);
  public modelService = inject(ModelService);
  public authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  statusPages = signal<StatusPageData[]>([]);
  incidentsMap = signal<Record<string, IncidentData[]>>({});

  globalStatus = computed(() => {
    const map = this.incidentsMap();
    let hasActive = false;
    for (const key of Object.keys(map)) {
      const active = map[key].filter(inc => inc.status !== 'Resolved');
      if (active.length > 0) {
        hasActive = true;
        break;
      }
    }
    return hasActive ? 'Degraded Performance' : 'All Systems Normal';
  });

  ngOnInit() {
    this.monitorService.getStatusPages().subscribe({
      next: data => {
        // Sort so 'platform-status' is always first
        const sorted = [...data].sort((a, b) => {
          if (a.slug === 'platform-status') return -1;
          if (b.slug === 'platform-status') return 1;
          return a.title.localeCompare(b.title);
        });
        this.statusPages.set(sorted);
        this.fetchAllIncidents(sorted);
      },
      error: err => console.error('Error fetching pages:', err),
    });

    this.modelService.fetchLatestStat();
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
}

