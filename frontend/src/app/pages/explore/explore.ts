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
import { VikingButton, VikingPageHeader } from '@dataengineeringformachinelearning/viking-ui';
import { VikingAppIcon } from '../../components/viking-app-icon/viking-app-icon';
import { RouterModule } from '@angular/router';
import { StatusCta } from '../../components/status-cta/status-cta';
import { StatusCard } from '../../components/status-card/status-card';
@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [
    CommonModule,
    VikingButton,
    VikingPageHeader,
    VikingAppIcon,
    RouterModule,
    StatusCta,
    StatusCard,
  ],
  templateUrl: './explore.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Explore implements OnInit {
  private monitorService = inject(MonitorService);
  public mlService = inject(MlService);
  public authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private injector = inject(Injector);

  statusPages = signal<StatusPageData[]>([]);
  loadFailed = signal<boolean>(false);
  isLoading = signal<boolean>(true);
  incidentsMap = this.monitorService.incidentsMap;
  servicesMap = this.monitorService.servicesMap;

  mockPage: StatusPageData = {
    id: 'mock-id',
    title: 'Loading Directory...',
    slug: 'loading',
    description: 'Fetching status pages from the platform directory...',
    created_at: new Date().toISOString(),
    user_id: null,
  };

  displayPages = computed(() => {
    if (this.isLoading() && !this.loadFailed()) {
      return [this.mockPage];
    }
    return this.statusPages();
  });

  constructor() {
    afterNextRender(() => {
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
    this.titleService.setTitle('Explore Public Status Pages - DEML APP');
    this.metaService.updateTag({
      name: 'description',
      content:
        'Browse community-published public service status pages and active system uptime monitors.',
    });
  }

  loadData() {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.monitorService.getStatusPages().subscribe({
      next: data => {
        // Under /explore we show all public status pages, including the main 'platform-status' system page
        if (!Array.isArray(data)) return;
        const publicPages = data.filter(p => p.is_published || p.slug === 'platform-status');
        this.statusPages.set(publicPages);
        this.monitorService.fetchAllIncidents(publicPages);
        this.monitorService.fetchAllServices(publicPages);

        for (const page of publicPages) {
          this.mlService.fetchLatestStat(page.id);
          this.mlService.fetchThreatReport(page.id);
        }

        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.statusPages.set([]);
        this.loadFailed.set(true);
        this.isLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  isRetrying = signal<boolean>(false);

  retryLoad() {
    this.isRetrying.set(true);
    window.location.reload();
  }
}
