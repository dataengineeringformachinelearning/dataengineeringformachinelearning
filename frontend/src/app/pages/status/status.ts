import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  signal,
  ChangeDetectorRef,
  effect,
  computed,
  afterNextRender,
  Injector,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { MonitorService, StatusPageData } from '../../services/monitor.service';
import { MlService } from '../../services/ml.service';
import { AuthService } from '../../services/auth.service';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule, Router } from '@angular/router';
import { Sidebar } from '../../components/sidebar/sidebar';
import { StatusCta } from '../../components/status-cta/status-cta';
import { SanityService } from '../../services/sanity.service';
import { StatusCard } from '../../components/status-card/status-card';

import { timeout } from 'rxjs';

@Component({
  selector: 'app-status',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
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
  private titleService = inject(Title);
  private metaService = inject(Meta);
  public sanityService = inject(SanityService);
  private injector = inject(Injector);

  statusPages = signal<StatusPageData[]>([]);
  loadFailed = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  incidentsMap = this.monitorService.incidentsMap;
  servicesMap = this.monitorService.servicesMap;

  mockPage: StatusPageData = {
    id: 'mock-id',
    title: 'Platform Status Feed',
    slug: 'platform-status',
    description: 'Real-time telemetry and status monitoring for all machine learning pipelines.',
    created_at: new Date().toISOString(),
    user_id: null,
  };

  displayPages = computed(() => {
    if (this.isLoading() && !this.loadFailed()) {
      return [this.mockPage];
    }
    return this.statusPages();
  });

  login() {
    this.router.navigate(['/login']);
  }

  constructor() {
    afterNextRender(() => {
      this.sanityService.fetchAnnouncements();

      effect(
        () => {
          if (this.authService.isInitialized()) {
            this.loadData();
          }
        },
        { injector: this.injector },
      );
    });
  }

  ngOnInit() {
    this.titleService.setTitle('Service Status Dashboard - Web Application');
    this.metaService.updateTag({
      name: 'description',
      content:
        'Real-time monitoring, service status checks, and uptime tracking for Web Application services.',
    });
  }

  loadData() {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    const isCrawler = typeof navigator !== 'undefined' && navigator.webdriver;
    if (isCrawler) {
      this.statusPages.set([this.mockPage]);
      this.isLoading.set(false);
      this.loadFailed.set(false);
      this.cdr.markForCheck();
      return;
    }
    if (this.authService.isAuthenticated()) {
      this.monitorService
        .getStatusPages()
        .pipe(timeout(15000))
        .subscribe({
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
            this.isLoading.set(false);
            this.cdr.markForCheck();
          },
          error: err => {
            console.error('Error fetching pages:', err);
            this.statusPages.set([]);
            this.loadFailed.set(true);
            this.isLoading.set(false);
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
