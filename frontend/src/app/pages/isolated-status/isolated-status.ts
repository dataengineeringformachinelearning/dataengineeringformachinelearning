import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  signal,
  ChangeDetectorRef,
  computed,
  effect,
  afterNextRender,
  Injector,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { MonitorService, StatusPageData } from '../../services/monitor.service';
import { MlService } from '../../services/ml.service';
import { AuthService } from '../../services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { formatServiceName } from '../../core/utils/formatter.utils';
import { SanityService } from '../../services/sanity.service';
import { SkeletonComponent } from 'boneyard-js/angular';
import { timeout } from 'rxjs';

@Component({
  selector: 'app-isolated-status',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
    SkeletonComponent,
  ],
  templateUrl: './isolated-status.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './isolated-status.scss',
})
export class IsolatedStatus implements OnInit {
  private monitorService = inject(MonitorService);
  public mlService = inject(MlService);
  public authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  public sanityService = inject(SanityService);
  private injector = inject(Injector);

  formatServiceName = formatServiceName;
  statusPages = signal<StatusPageData[]>([]);
  loadFailed = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  incidentsMap = this.monitorService.incidentsMap;
  servicesMap = this.monitorService.servicesMap;

  p99LatencyMap = signal<{ [key: string]: number }>({});
  totalRequestsMap = signal<{ [key: string]: number }>({});

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

  globalPageStatus = computed(() => {
    const pages = this.statusPages();
    if (pages.length === 0) return 'Operational';
    const pageId = pages[0].id;

    const incs = this.incidentsMap()[pageId] || [];
    const activeIncidents = incs.filter(i => i.status !== 'Resolved');

    const services = this.servicesMap()[pageId] || [];
    const outages = services.filter(s => s.status === 'Outage');
    const degraded = services.filter(s => s.status === 'Degraded');

    if (activeIncidents.length > 0 || outages.length > 0) {
      return 'Outage';
    } else if (degraded.length > 0) {
      return 'Degraded';
    }
    return 'Operational';
  });

  login() {
    this.router.navigate(['/login']);
  }

  slug = signal<string | null>(null);

  constructor() {
    afterNextRender(() => {
      this.sanityService.fetchAnnouncements();

      effect(
        () => {
          const currentSlug = this.slug();
          const isAuthInit = this.authService.isInitialized();
          if (currentSlug && isAuthInit) {
            this.loadPage(currentSlug);
          }
        },
        { injector: this.injector },
      );
    });
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug');
      this.slug.set(slug);
    });
  }

  loadPage(slug: string) {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    const isCrawler =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || window.location.search.includes('boneyard'));
    if (isCrawler) {
      this.statusPages.set([this.mockPage]);
      this.isLoading.set(false);
      this.loadFailed.set(false);
      this.cdr.markForCheck();
      return;
    }
    this.monitorService
      .getStatusPageBySlug(slug)
      .pipe(timeout(15000))
      .subscribe({
        next: page => {
          const pages = [page];
          this.statusPages.set(pages);
          this.monitorService.fetchAllIncidents(pages);
          this.monitorService.fetchAllServices(pages);
          this.mlService.fetchLatestStat(page.id);
          this.mlService.fetchThreatReport(page.id);

          setTimeout(
            () => {
              const baseSla = page.cumulative_sla ?? 99.9;
              const p99 = Math.floor(
                baseSla >= 99 ? 15 + Math.random() * 20 : 150 + Math.random() * 200,
              );
              const totalReqs = Math.floor(1000 + Math.random() * 5000);
              this.p99LatencyMap.update(m => ({ ...m, [page.id]: p99 }));
              this.totalRequestsMap.update(m => ({ ...m, [page.id]: totalReqs }));
              this.cdr.markForCheck();
            },
            800 + Math.random() * 700,
          );

          this.titleService.setTitle(
            `${page.title} Status - Data Engineering for Machine Learning`,
          );
          this.metaService.updateTag({
            name: 'description',
            content: `Operational status, real-time alerts, and historical uptime details for the ${page.title} service status page.`,
          });

          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
        error: err => {
          console.error('Error fetching page by slug:', err);
          this.statusPages.set([]);
          this.loadFailed.set(true);
          this.isLoading.set(false);
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
