import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  signal,
  ChangeDetectorRef,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import {
  MonitorService,
  StatusPageData,
  IncidentData,
  MonitoredServiceData,
} from '../../services/monitor.service';
import { ModelService } from '../../services/model.service';
import { AuthService } from '../../services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Sidebar } from '../../components/sidebar/sidebar';
import { StatusCta } from '../../components/status-cta/status-cta';
import { LoginDialog } from '../../components/login-dialog/login-dialog';
import { formatServiceName } from '../../core/utils/formatter.utils';
import { SanityService } from '../../services/sanity.service';

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
    StatusCta,
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
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  public sanityService = inject(SanityService);

  formatServiceName = formatServiceName;
  statusPages = signal<StatusPageData[]>([]);
  loadFailed = signal<boolean>(false);
  incidentsMap = this.monitorService.incidentsMap;
  servicesMap = this.monitorService.servicesMap;

  login() {
    const dialogRef = this.dialog.open(LoginDialog, {
      width: '400px',
      hasBackdrop: true,
      backdropClass: 'blur-backdrop',
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (result === true) {
        window.location.reload();
      }
    });
  }

  constructor() {
    effect(() => {
      if (this.authService.isInitialized()) {
        this.loadData();
      }
    });
  }

  ngOnInit() {
    this.titleService.setTitle('Service Status Dashboard - Data Engineering for Machine Learning');
    this.metaService.updateTag({
      name: 'description',
      content:
        'Real-time monitoring, service status checks, and uptime tracking for Data Engineering for Machine Learning services.',
    });
    this.sanityService.fetchAnnouncements();
  }

  loadData() {
    this.loadFailed.set(false);
    if (this.authService.isAuthenticated()) {
      this.monitorService.getStatusPages().subscribe({
        next: data => {
          // Include user's own pages AND the platform status page
          const myPages = data.filter(
            p => p.user_id === this.authService.currentUserId() || p.slug === 'platform-status',
          );
          // Sort so platform-status is always first
          const sorted = [...myPages].sort((a, b) => {
            if (a.slug === 'platform-status') return -1;
            if (b.slug === 'platform-status') return 1;
            return a.title.localeCompare(b.title);
          });
          this.statusPages.set(sorted);
          this.monitorService.fetchAllIncidents(sorted);
          this.monitorService.fetchAllServices(sorted);
          sorted.forEach(page => {
            this.modelService.fetchLatestStat(page.id);
          });
          this.cdr.markForCheck();
        },
        error: err => {
          console.error('Error fetching pages:', err);
          this.statusPages.set([]);
          this.loadFailed.set(true);
          this.cdr.markForCheck();
        },
      });
    } else {
      this.router.navigate(['/status/platform-status']);
    }
  }

  getPageStatus(pageId: string): string {
    const incs = this.incidentsMap()[pageId] || [];
    const active = incs.filter(i => i.status !== 'Resolved');
    if (active.length > 0) {
      return active[0].status;
    }
    return 'Operational';
  }

  isRetrying = signal<boolean>(false);

  getPageStatusClass(pageId: string): string {
    const status = this.getPageStatus(pageId);
    if (status === 'Operational') return 'operational';
    return status.toLowerCase();
  }

  retryLoad() {
    this.isRetrying.set(true);
    window.location.reload();
  }
}
