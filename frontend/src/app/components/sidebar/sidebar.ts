import {
  Component,
  OnInit,
  inject,
  ChangeDetectionStrategy,
  signal,
  computed,
  ChangeDetectorRef,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BookService } from '../../services/book.service';
import { SettingsService } from '../../services/settings.service';
import { AuthService } from '../../services/auth.service';
import { OramaSearchService, SearchItem } from '../../services/orama-search.service';
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
  imports: [CommonModule, RouterModule, MatIconModule],
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

  isCollapsed = signal<boolean>(false);
  isDocumentationActive = signal(false);
  isSettingsActive = signal(false);

  // Tree view expansion states
  isChaptersExpanded = signal<boolean>(true);
  isYourPagesExpanded = signal<boolean>(true);

  // Search state
  searchQuery = signal<string>('');
  searchResults = signal<SearchItem[]>([]);

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

  async onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const query = input.value;
    this.searchQuery.set(query);
    if (!query.trim()) {
      this.searchResults.set([]);
      return;
    }
    const results = await this.searchService.search(query);
    this.searchResults.set(results);
    this.cdr.markForCheck();
  }

  handleResultClick(result: SearchItem) {
    if (result.type === 'chapter') {
      const pageIndex = parseInt(result.id, 10);
      this.bookService.goToPage(pageIndex);
      this.router.navigate(['/documentation']);
    } else if (result.type === 'status-page') {
      const page = this.statusPages().find(p => p.id === result.id);
      if (page) {
        this.settingsService.selectPage(page);
        this.router.navigate(['/settings']);
      }
    }
    this.searchQuery.set('');
    this.searchResults.set([]);
    const searchInput = document.querySelector('.sidebar-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = '';
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
