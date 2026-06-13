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
import { RouterModule } from '@angular/router';
import { Sidebar } from '../../components/sidebar/sidebar';
import { StatusCta } from '../../components/status-cta/status-cta';
import { formatServiceName } from '../../core/utils/formatter.utils';

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
    StatusCta,
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
  private titleService = inject(Title);
  private metaService = inject(Meta);

  formatServiceName = formatServiceName;
  statusPages = signal<StatusPageData[]>([]);
  loadFailed = signal<boolean>(false);
  incidentsMap = this.monitorService.incidentsMap;
  servicesMap = this.monitorService.servicesMap;

  constructor() {
    effect(() => {
      if (this.authService.isInitialized()) {
        this.loadData();
      }
    });
  }

  ngOnInit() {
    this.titleService.setTitle(
      'Explore Public Status Pages - Data Engineering for Machine Learning',
    );
    this.metaService.updateTag({
      name: 'description',
      content:
        'Browse community-published public service status pages and active system uptime monitors.',
    });
  }

  loadData() {
    this.loadFailed.set(false);
    this.monitorService.getStatusPages().subscribe({
      next: data => {
        // Under /explore we show all public status pages, including the main 'platform-status' system page
        this.statusPages.set(data);
        this.monitorService.fetchAllIncidents(data);
        this.monitorService.fetchAllServices(data);
        data.forEach(page => {
          this.modelService.fetchLatestStat(page.id);
        });
        this.cdr.markForCheck();
      },
      error: err => {
        console.error('Error fetching pages for explore:', err);
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
