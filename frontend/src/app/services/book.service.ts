import { Injectable, signal, computed } from '@angular/core';
import pageMarkdown from '../../assets/content/page.md';

export interface Chapter {
  title: string;
  content: string;
}

@Injectable({
  providedIn: 'root',
})
export class BookService {
  chapters = signal<Chapter[]>([]);
  activePageIndex = signal<number>(0);

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

  constructor() {
    this.parseMarkdown();
  }

  parseMarkdown() {
    // Split content dynamically by '## Chapter ', '## Appendix', '## My Notes...', '## Acknowledgements', or '## Introduction' headers
    const rawChunks = pageMarkdown.split(
      /(?=^## (?:Chapter \d+:|Appendix|My Notes on Deployment & Release|Acknowledgements|Introduction))/m,
    );
    const parsed: Chapter[] = [
      {
        title: 'Cover',
        content: '',
      },
    ];

    rawChunks.forEach(chunk => {
      const trimmed = chunk.trim();
      if (!trimmed) return;

      // Extract title from the first line (starts with '## ')
      const lines = trimmed.split('\n');
      const firstLine = lines[0];
      const title = firstLine.startsWith('## ')
        ? firstLine.replace('## ', '').trim()
        : 'Introduction';

      parsed.push({
        title,
        content: trimmed,
      });
    });

    // If no chapters parsed, push the entire content as fallback
    if (parsed.length === 1 && parsed[0].title === 'Cover') {
      parsed.push({
        title: 'Book Content',
        content: pageMarkdown,
      });
    }

    this.chapters.set(parsed);
  }

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

  scrollToTop() {
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  }
}
