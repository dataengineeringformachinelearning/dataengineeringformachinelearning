import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageComponent } from '../../components/page/page';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import pageMarkdown from '../../../assets/content/page.md';

interface Chapter {
  title: string;
  content: string;
}

@Component({
  selector: 'app-book',
  standalone: true,
  imports: [
    CommonModule,
    PageComponent,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RouterModule
  ],
  templateUrl: './book.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './book.scss',
})
export class Book {
  public authService = inject(AuthService);

  chapters = signal<Chapter[]>([]);
  activePageIndex = signal<number>(0);

  constructor() {
    this.parseMarkdown();
  }

  parseMarkdown() {
    // Split content dynamically by '## Chapter ' headers
    const rawChunks = pageMarkdown.split(/(?=^## Chapter \d+:)/m);
    const parsed: Chapter[] = [];

    for (const chunk of rawChunks) {
      const trimmed = chunk.trim();
      if (!trimmed) continue;

      // Extract title from the first line (starts with '## ')
      const lines = trimmed.split('\n');
      const firstLine = lines[0];
      const title = firstLine.startsWith('## ') ? firstLine.replace('## ', '').trim() : 'Introduction';

      parsed.push({
        title,
        content: trimmed
      });
    }

    // If no chapters parsed, push the entire content as fallback
    if (parsed.length === 0) {
      parsed.push({
        title: 'Book Content',
        content: pageMarkdown
      });
    }

    this.chapters.set(parsed);
  }

  activeChapter = computed(() => {
    const list = this.chapters();
    const idx = this.activePageIndex();
    return list[idx] || null;
  });

  progress = computed(() => {
    const total = this.chapters().length;
    if (total === 0) return 0;
    return Math.round(((this.activePageIndex() + 1) / total) * 100);
  });

  nextPage() {
    if (this.activePageIndex() < this.chapters().length - 1) {
      this.activePageIndex.update(idx => idx + 1);
      this.scrollToTop();
    }
  }

  prevPage() {
    if (this.activePageIndex() > 0) {
      this.activePageIndex.update(idx => idx - 1);
      this.scrollToTop();
    }
  }

  goToPage(index: number) {
    if (index >= 0 && index < this.chapters().length) {
      this.activePageIndex.set(index);
      this.scrollToTop();
    }
  }

  private scrollToTop() {
    const contentArea = document.querySelector('.dashboard-main');
    if (contentArea) {
      contentArea.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
