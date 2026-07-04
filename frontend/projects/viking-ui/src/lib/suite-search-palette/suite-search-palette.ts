import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  PLATFORM_ID,
  computed,
  inject,
  input,
  model,
  OnInit,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { VikingSearchPalette } from '../search-palette/search-palette';
import {
  DEFAULT_SITE_URLS,
  SiteDrakkarContext,
  SiteUrls,
} from '../site-drakkar/site-drakkar.config';
import { buildSuiteSearchItems, type SuiteSearchItem } from '../site-drakkar/suite-search-items';

/**
 * viking-suite-search-palette — curated ⌘K command palette for deml.app and Angular shells.
 * Wraps `viking-search-palette` with suite navigation items from site-drakkar config.
 */
@Component({
  selector: 'viking-suite-search-palette',
  imports: [VikingSearchPalette],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <viking-search-palette
      [(open)]="open"
      [(query)]="query"
      [placeholder]="placeholder()"
      (paletteKeydown)="onPaletteKeydown($event)"
    >
      <div class="viking-search-results" role="listbox" aria-label="Search results">
        @for (group of groupedResults(); track group.name) {
          <p class="viking-search-group-label" role="presentation">{{ group.name }}</p>
          @for (item of group.items; track item.title + item.href) {
            <button
              type="button"
              class="viking-search-result"
              [class.is-selected]="item === activeItem()"
              role="option"
              [attr.aria-selected]="item === activeItem()"
              (click)="activate(item)"
              (mouseenter)="activeIndex.set(flatResults().indexOf(item))"
            >
              <span class="viking-search-result-content">
                <span class="viking-search-result-title">{{ item.title }}</span>
                @if (item.snippet) {
                  <span class="viking-search-result-snippet">{{ item.snippet }}</span>
                }
              </span>
            </button>
          }
        }
        @if (flatResults().length === 0) {
          <div class="viking-search-empty" role="status">
            <p>{{ query().trim() ? 'No results found' : 'Start typing to search the suite…' }}</p>
          </div>
        }
      </div>
    </viking-search-palette>
  `,
})
export class VikingSuiteSearchPalette implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);

  readonly context = input<SiteDrakkarContext>('app');
  readonly urls = input<SiteUrls>(DEFAULT_SITE_URLS);
  readonly placeholder = input<string>('Search documentation, dashboard, settings…');

  readonly bindShortcut = input<boolean>(true);

  readonly open = model<boolean>(false);
  readonly query = model<string>('');

  /** Optional callback when the palette opens (e.g. SearchService bridge). */
  readonly onRegister = input<(handlers: { open: () => void; close: () => void }) => void>();

  protected readonly activeIndex = signal(0);

  private readonly allItems = computed(() =>
    buildSuiteSearchItems(this.context(), this.urls()),
  );

  protected readonly flatResults = computed(() => {
    const q = this.query().trim().toLowerCase();
    const items = this.allItems();
    if (!q) {
      return items;
    }
    return items.filter(item => {
      const haystack = [
        item.title,
        item.snippet ?? '',
        item.group ?? '',
        item.href,
        ...(item.keywords ?? []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  });

  protected readonly groupedResults = computed(() => {
    const map = new Map<string, SuiteSearchItem[]>();
    for (const item of this.flatResults()) {
      const group = item.group ?? 'Links';
      map.set(group, [...(map.get(group) ?? []), item]);
    }
    return [...map.entries()].map(([name, items]) => ({ name, items }));
  });

  protected readonly activeItem = computed(() => {
    const results = this.flatResults();
    const index = Math.min(Math.max(0, this.activeIndex()), Math.max(0, results.length - 1));
    return results[index] ?? null;
  });

  ngOnInit(): void {
    this.onRegister()?.({
      open: () => this.openPalette(),
      close: () => this.closePalette(),
    });
  }

  @HostListener('document:keydown', ['$event'])
  protected onGlobalKeydown(event: KeyboardEvent): void {
    if (!this.bindShortcut() || !isPlatformBrowser(this.platformId)) {
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (this.open()) {
        this.closePalette();
      } else {
        this.openPalette();
      }
    }
  }

  /** Opens the palette and resets keyboard selection. */
  openPalette(): void {
    this.activeIndex.set(0);
    this.open.set(true);
  }

  /** Closes the palette and clears the query. */
  closePalette(): void {
    this.open.set(false);
    this.query.set('');
    this.activeIndex.set(0);
  }

  protected onPaletteKeydown(event: KeyboardEvent): void {
    const results = this.flatResults();
    if (results.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.update(index => Math.min(results.length - 1, index + 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.update(index => Math.max(0, index - 1));
      return;
    }

    if (event.key === 'Enter') {
      const item = this.activeItem();
      if (item) {
        event.preventDefault();
        this.activate(item);
      }
    }
  }

  protected activate(item: SuiteSearchItem): void {
    this.closePalette();

    if (item.action === 'cookie-settings') {
      const widgets = (globalThis as { DemlWidgets?: { openCookieSettings?: () => void } }).DemlWidgets;
      widgets?.openCookieSettings?.();
      return;
    }

    if (item.action === 'bug-report') {
      const widgets = (globalThis as { DemlWidgets?: { openBugReport?: () => void } }).DemlWidgets;
      if (widgets?.openBugReport) {
        widgets.openBugReport();
        return;
      }
    }

    if (!isPlatformBrowser(this.platformId) || !item.href || item.href === '#') {
      return;
    }

    if (item.href.startsWith('/')) {
      window.location.assign(item.href);
      return;
    }

    window.location.assign(item.href);
  }
}
