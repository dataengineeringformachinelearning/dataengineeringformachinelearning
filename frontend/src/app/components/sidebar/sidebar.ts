import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  signal,
  computed,
  ChangeDetectorRef,
  effect,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BookService } from '../../services/book.service';
import { SettingsService } from '../../services/settings.service';
import { AuthService } from '../../services/auth.service';
import { OramaSearchService, SearchItem } from '../../services/orama-search.service';
import { SearchDialog } from '../search-dialog/search-dialog';
import { filter } from 'rxjs/operators';
import {
  MonitorService,
  StatusPageData,
  IncidentData,
  MonitoredServiceData,
} from '../../services/monitor.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatDialogModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar implements OnInit {
  public authService = inject(AuthService);
  private monitorService = inject(MonitorService);
  private cdr = inject(ChangeDetectorRef);
  public bookService = inject(BookService);
  public settingsService = inject(SettingsService);
  private router = inject(Router);
  private searchService = inject(OramaSearchService);
  private dialog = inject(MatDialog);

  isCollapsed = signal<boolean>(false);
  isDocumentationActive = signal(false);
  isSettingsActive = signal(false);

  // Tree view expansion states
  isChaptersExpanded = signal<boolean>(true);
  isYourPagesExpanded = signal<boolean>(true);

  constructor() {
    effect(() => {
      const chapters = this.bookService.chapters();
      const pages = this.statusPages();
      this.indexSidebarItems(chapters, pages);
    });
  }

  private async indexSidebarItems(chapters: any[], pages: any[]) {
    const items: SearchItem[] = [];

    chapters.forEach((chapter, index) => {
      items.push({
        id: String(index),
        title: chapter.title,
        content: chapter.content || '',
        type: 'chapter',
        url: String(index),
      });
    });

    pages.forEach(page => {
      items.push({
        id: page.id,
        title: page.title,
        content: page.description || '',
        type: 'status-page',
        url: page.id,
      });
    });

    await this.searchService.clearAndIndex(items);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    const isModifier = event.metaKey || event.ctrlKey;
    const isK = event.key.toLowerCase() === 'k';
    const isSlash = event.key === '/';

    const activeEl = document.activeElement;
    const isTyping =
      activeEl &&
      (activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.hasAttribute('contenteditable'));

    if ((isModifier && isK) || (isSlash && !isTyping)) {
      event.preventDefault();
      this.openSearchDialog();
    }
  }

  openSearchDialog() {
    // Check if dialog is already open
    if (this.dialog.openDialogs.some(d => d.componentInstance instanceof SearchDialog)) {
      return;
    }

    this.dialog.open(SearchDialog, {
      width: '600px',
      maxWidth: '95vw',
      panelClass: 'command-palette-dialog',
    });
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
      const active = map[key].filter(inc => inc.status !== 'Resolved');
      if (active.length > 0) {
        return 'Degraded Performance';
      }
    }

    const services = this.servicesMap();
    for (const key of Object.keys(services)) {
      const down = services[key].filter(s => s.status === 'Outage');
      if (down.length > 0) {
        return 'Degraded Performance';
      }
    }

    return 'All Systems Normal';
  });

  ngOnInit() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.isDocumentationActive.set(this.router.url.startsWith('/documentation'));
        this.isSettingsActive.set(this.router.url.startsWith('/settings'));
        this.cdr.markForCheck();
      });
    this.isDocumentationActive.set(this.router.url.startsWith('/documentation'));
    this.isSettingsActive.set(this.router.url.startsWith('/settings'));

    this.monitorService.getStatusPages().subscribe({
      next: data => {
        this.statusPages.set(data);
        this.monitorService.fetchAllIncidents(data);
        this.monitorService.fetchAllServices(data);
        this.cdr.markForCheck();
      },
      error: err => {
        console.error('Error fetching pages for sidebar:', err);
      },
    });
  }
}
