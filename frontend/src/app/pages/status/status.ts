import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  signal,
  ChangeDetectorRef,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { MonitorService, StatusPageData } from '../../services/monitor.service';
import { MlService } from '../../services/ml.service';
import { AuthService } from '../../services/auth.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule, Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Sidebar } from '../../components/sidebar/sidebar';
import { StatusCta } from '../../components/status-cta/status-cta';
import { LoginDialog } from '../../components/login-dialog/login-dialog';
import { SanityService } from '../../services/sanity.service';
import { StatusCard } from '../../components/status-card/status-card';

@Component({
  selector: 'app-status',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
    MatDialogModule,
    Sidebar,
    StatusCta,
    StatusCard,
  ],
  templateUrl: './status.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './status.scss',
})
export class Status implements OnInit {
  private monitorService = inject(MonitorService);
  public mlService = inject(MlService);
  public authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  public sanityService = inject(SanityService);

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
            this.mlService.fetchLatestStat(page.id);
            this.mlService.fetchThreatReport(page.id);
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

  isRetrying = signal<boolean>(false);

  retryLoad() {
    this.isRetrying.set(true);
    window.location.reload();
  }
}
