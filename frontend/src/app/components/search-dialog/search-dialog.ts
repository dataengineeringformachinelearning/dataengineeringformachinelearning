import {
  Component,
  inject,
  ChangeDetectionStrategy,
  signal,
  ChangeDetectorRef,
  HostListener,
  ElementRef,
  ViewChild,
  AfterViewInit,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { OramaSearchService, SearchItem } from '../../services/orama-search.service';
import { BookService } from '../../services/book.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-search-dialog',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatDialogModule],
  templateUrl: './search-dialog.html',
  styleUrl: './search-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchDialog implements AfterViewInit {
  private dialogRef = inject(MatDialogRef<SearchDialog>);
  private searchService = inject(OramaSearchService);
  private bookService = inject(BookService);
  private settingsService = inject(SettingsService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  searchQuery = signal<string>('');
  searchResults = signal<SearchItem[]>([]);
  selectedIndex = signal<number>(0);

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  ngAfterViewInit() {
    // Focus search input on load
    setTimeout(() => {
      if (this.searchInput) {
        this.searchInput.nativeElement.focus();
      }
    }, 100);
  }

  async onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    const query = input.value;
    this.searchQuery.set(query);
    this.selectedIndex.set(0);

    if (!query.trim()) {
      this.searchResults.set([]);
      return;
    }

    try {
      const results = await this.searchService.search(query);
      this.searchResults.set(results);
    } catch (e) {
      console.error('Orama search query failed:', e);
      this.searchResults.set([]);
    }
    this.cdr.markForCheck();
  }

  async onSuggestionClick(query: string) {
    this.searchQuery.set(query);
    this.selectedIndex.set(0);
    try {
      const results = await this.searchService.search(query);
      this.searchResults.set(results);
    } catch (e) {
      console.error('Orama search query failed:', e);
      this.searchResults.set([]);
    }
    this.cdr.markForCheck();
  }

  escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  highlightText(text: string, query: string): string {
    if (!query || !query.trim()) return this.escapeHtml(text);
    const escapedText = this.escapeHtml(text);
    const lowerText = escapedText.toLowerCase();
    const lowerQuery = query.toLowerCase();

    let result = '';
    let lastIndex = 0;
    let index = lowerText.indexOf(lowerQuery);

    const maxHighlights = 100;
    let count = 0;

    while (index !== -1 && count < maxHighlights) {
      count++;
      result += escapedText.substring(lastIndex, index);
      const match = escapedText.substring(index, index + query.length);
      result += `<mark class="search-highlight">${match}</mark>`;
      lastIndex = index + query.length;
      index = lowerText.indexOf(lowerQuery, lastIndex);
    }
    result += escapedText.substring(lastIndex);
    return result;
  }

  getHighlightedTitle(result: SearchItem): string {
    return this.highlightText(result.title, this.searchQuery());
  }

  getHighlightedSnippet(result: SearchItem): string {
    const content = result.content || '';
    const query = this.searchQuery().trim();
    if (!query) {
      return this.escapeHtml(content.substring(0, 60)) + (content.length > 60 ? '...' : '');
    }

    const index = content.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) {
      return this.escapeHtml(content.substring(0, 60)) + (content.length > 60 ? '...' : '');
    }

    const start = Math.max(0, index - 25);
    const end = Math.min(content.length, index + query.length + 35);
    let snippet = content.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';

    return this.highlightText(snippet, query);
  }

  handleResultClick(result: SearchItem) {
    this.zone.run(() => {
      if (result.type === 'chapter') {
        const pageIndex = parseInt(result.id, 10);
        this.bookService.goToPage(pageIndex);
        // Avoid unnecessary navigation if already on the book; signal drives the view.
        const current = this.router.url || '';
        if (!current.startsWith('/book')) {
          this.router.navigate(['/book']);
        }
      } else if (result.type === 'status-page') {
        const page = this.settingsService.statusPages().find(p => p.id === result.id);
        if (page) {
          this.settingsService.selectPage(page);
          this.router.navigate(['/settings']);
        }
      }
      this.cdr.markForCheck();
      this.close();
    });
  }

  close() {
    this.dialogRef.close();
  }

  @HostListener('keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    const results = this.searchResults();
    if (!results.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex.update(index => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex.update(index => (index - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selected = results[this.selectedIndex()];
      if (selected) {
        this.handleResultClick(selected);
      }
    }
  }
}
