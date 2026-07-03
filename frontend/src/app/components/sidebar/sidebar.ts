import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  signal,
  computed,
  ChangeDetectorRef,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { VikingAppSidebar } from '@deml/viking-ui';
import { VikingAppIcon } from '../viking-app-icon/viking-app-icon';
import { DemlBrandLogo } from '../deml-brand-logo/deml-brand-logo';
import { SettingsService } from '../../services/settings.service';
import { AuthService } from '../../services/auth.service';
import { filter } from 'rxjs/operators';
import { MonitorService, StatusPageData } from '../../services/monitor.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, VikingAppSidebar, VikingAppIcon, DemlBrandLogo],
  templateUrl: './sidebar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar implements OnInit {
  public authService = inject(AuthService);
  private monitorService = inject(MonitorService);
  private cdr = inject(ChangeDetectorRef);
  public settingsService = inject(SettingsService);
  private router = inject(Router);

  isCollapsed = signal<boolean>(false);
  isSettingsActive = signal(false);

  // Tree view expansion states
  isChaptersExpanded = signal<boolean>(true);
  isYourPagesExpanded = signal<boolean>(true);

  // Resizing state
  sidebarWidth = signal<number>(260);
  isDragging = signal<boolean>(false);
  private startX = 0;
  private startWidth = 0;

  startResize(event: MouseEvent) {
    if (this.isCollapsed()) return;
    this.isDragging.set(true);
    this.startX = event.clientX;
    this.startWidth = this.sidebarWidth();
    document.body.style.cursor = 'col-resize';
    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.isDragging()) return;
    const diff = event.clientX - this.startX;
    let newWidth = this.startWidth + diff;

    if (newWidth < 200) newWidth = 200;
    if (newWidth > 800) newWidth = 800;

    this.sidebarWidth.set(newWidth);
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    if (this.isDragging()) {
      this.isDragging.set(false);
      document.body.style.cursor = '';
      localStorage.setItem('sidebarWidth', this.sidebarWidth().toString());
    }
  }

  toggleCollapse() {
    this.isCollapsed.update(c => !c);
  }

  statusPages = signal<StatusPageData[]>([]);

  incidentsMap = this.monitorService.incidentsMap;
  servicesMap = this.monitorService.servicesMap;

  globalStatus = computed(() => {
    const map = this.incidentsMap();
    for (const key of Object.keys(map)) {
      const incs = map[key];
      if (!Array.isArray(incs)) continue;
      const active = incs.filter(inc => inc.status !== 'Resolved');
      if (active.length > 0) {
        return 'Degraded Performance';
      }
    }

    const services = this.servicesMap();
    for (const key of Object.keys(services)) {
      const svcs = services[key];
      if (!Array.isArray(svcs)) continue;
      const down = svcs.filter(s => s.status === 'Outage');
      if (down.length > 0) {
        return 'Degraded Performance';
      }
    }

    return 'All Systems Normal';
  });

  ngOnInit() {
    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
      this.sidebarWidth.set(parseInt(savedWidth, 10));
    }

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.isSettingsActive.set(this.router.url.startsWith('/settings'));
        this.cdr.markForCheck();
      });
    this.isSettingsActive.set(this.router.url.startsWith('/settings'));

    this.monitorService.getStatusPages().subscribe({
      next: data => {
        if (Array.isArray(data)) {
          this.statusPages.set(data);
          this.monitorService.fetchAllIncidents(data);
          this.monitorService.fetchAllServices(data);
        } else {
          this.statusPages.set([]);
        }
        this.cdr.markForCheck();
      },
      error: err => {
        console.error('Error fetching pages for sidebar:', err);
      },
    });
  }
}
