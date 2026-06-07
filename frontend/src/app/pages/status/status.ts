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
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Sidebar } from '../../components/sidebar/sidebar';
import { StatusCta } from '../../components/status-cta/status-cta';


@Component({
  selector: 'app-status',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
    MatDialogModule,
    Sidebar,
    StatusCta
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
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);

  statusPages = signal<StatusPageData[]>([]);
  incidentsMap = signal<Record<string, IncidentData[]>>({});
  servicesMap = signal<Record<string, MonitoredServiceData[]>>({});


  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug');
      if (slug) {
        this.monitorService.getStatusPageBySlug(slug).subscribe({
          next: page => {
            const pages = [page];
            this.statusPages.set(pages);
            this.fetchAllIncidents(pages);
            this.fetchAllServices(pages);
            this.modelService.fetchLatestStat(page.id);
            this.cdr.markForCheck();
          },
          error: err => {
            console.error('Error fetching page by slug:', err);
            this.statusPages.set([]);
            this.cdr.markForCheck();
          }
        });
      } else {
        if (this.authService.isAuthenticated()) {
          this.monitorService.getStatusPages().subscribe({
            next: data => {
              const myPages = data.filter(p => p.user_id === this.authService.currentUserId() && p.slug !== 'platform-status');
              this.statusPages.set(myPages);
              this.fetchAllIncidents(myPages);
              this.fetchAllServices(myPages);
              myPages.forEach(page => {
                this.modelService.fetchLatestStat(page.id);
              });
              this.cdr.markForCheck();
            },
            error: err => {
              console.error('Error fetching pages:', err);
              this.statusPages.set([]);
              this.cdr.markForCheck();
            },
          });
        } else {
          this.statusPages.set([]);
          this.cdr.markForCheck();
        }
      }
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

