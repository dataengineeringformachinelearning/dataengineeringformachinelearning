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
import { LoginDialog } from '../../components/login-dialog/login-dialog';
import { formatServiceName } from '../../core/utils/formatter.utils';

@Component({
  selector: 'app-isolated-status',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
    MatDialogModule,
  ],
  templateUrl: './isolated-status.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './isolated-status.scss',
})
export class IsolatedStatus implements OnInit {
  private monitorService = inject(MonitorService);
  public modelService = inject(ModelService);
  public authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private titleService = inject(Title);
  private metaService = inject(Meta);

  formatServiceName = formatServiceName;
  statusPages = signal<StatusPageData[]>([]);
  loadFailed = signal<boolean>(false);
  incidentsMap = this.monitorService.incidentsMap;
  servicesMap = this.monitorService.servicesMap;

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

  slug = signal<string | null>(null);

  constructor() {
    effect(() => {
      const currentSlug = this.slug();
      const isAuthInit = this.authService.isInitialized();
      if (currentSlug && isAuthInit) {
        this.loadPage(currentSlug);
      }
    });
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const slug = params.get('slug');
      this.slug.set(slug);
    });
    this.modelService.fetchThreatReport();
  }

  loadPage(slug: string) {
    this.loadFailed.set(false);
    this.monitorService.getStatusPageBySlug(slug).subscribe({
      next: page => {
        const pages = [page];
        this.statusPages.set(pages);
        this.monitorService.fetchAllIncidents(pages);
        this.monitorService.fetchAllServices(pages);
        this.modelService.fetchLatestStat(page.id);

        this.titleService.setTitle(`${page.title} Status - Data Engineering for Machine Learning`);
        this.metaService.updateTag({
          name: 'description',
          content: `Operational status, real-time alerts, and historical uptime details for the ${page.title} service status page.`,
        });

        this.cdr.markForCheck();
      },
      error: err => {
        console.error('Error fetching page by slug:', err);
        this.statusPages.set([]);
        this.loadFailed.set(true);
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
