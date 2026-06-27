import { Component, ChangeDetectionStrategy, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { PageComponent } from '../../components/page/page';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { BookService } from '../../services/book.service';
import { OramaSearchService } from '../../services/orama-search.service';
import {
  UnifiedSelect,
  SelectOption,
} from '../../components/unified-select/unified-select.component';

@Component({
  selector: 'app-book',
  standalone: true,
  imports: [
    CommonModule,
    PageComponent,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
    UnifiedSelect,
  ],
  templateUrl: './book.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './book.scss',
})
export class Book implements OnInit {
  public bookService = inject(BookService);
  private titleService = inject(Title);
  private metaService = inject(Meta);
  private searchService = inject(OramaSearchService);
  public chapterOptions: SelectOption[] = [];

  openSearchDialog() {
    this.searchService.openSearchDialog();
  }

  ngOnInit() {
    this.titleService.setTitle('The Book - DEML APP');
    this.metaService.updateTag({
      name: 'description',
      content: 'Interactive guide, working notes, and reference chapters on DEML APP.',
    });
    this.chapterOptions = this.bookService.chapters().map((c, i) => ({
      value: i,
      label: c.title,
    }));
  }

  private touchStartX = 0;
  private touchStartY = 0;
  private touchEndX = 0;
  private touchEndY = 0;

  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.changedTouches[0].screenX;
    this.touchStartY = event.changedTouches[0].screenY;
  }

  onTouchEnd(event: TouchEvent) {
    this.touchEndX = event.changedTouches[0].screenX;
    this.touchEndY = event.changedTouches[0].screenY;
    this.handleSwipe();
  }

  onChapterChange(index: number) {
    this.bookService.goToPage(index);
  }

  private handleSwipe() {
    const swipeThreshold = 50;
    const diffX = this.touchStartX - this.touchEndX;
    const diffY = this.touchStartY - this.touchEndY;

    // Only trigger if horizontal swipe is significantly larger than vertical
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
      if (diffX > 0) {
        // Swiped left -> Next page
        this.bookService.nextPage();
      } else {
        // Swiped right -> Previous page
        this.bookService.prevPage();
      }
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowRight') {
      this.bookService.nextPage();
    } else if (event.key === 'ArrowLeft') {
      this.bookService.prevPage();
    }
  }
}
