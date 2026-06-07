import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageComponent } from '../../components/page/page';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MonitorService, StatusPageData, IncidentData, MonitoredServiceData } from '../../services/monitor.service';
import pageMarkdown from '../../../assets/content/page.md';

interface Chapter {
  title: string;
  content: string;
}
import { Sidebar } from '../../components/sidebar/sidebar';

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
    Sidebar
  ],
  templateUrl: './book.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './book.scss',
})
export class Book implements OnInit {
  public authService = inject(AuthService);
  private monitorService = inject(MonitorService);
  private cdr = inject(ChangeDetectorRef);

  chapters = signal<Chapter[]>([]);
  activePageIndex = signal<number>(0);

  statusPages = signal<StatusPageData[]>([]);
  incidentsMap = signal<Record<string, IncidentData[]>>({});
  servicesMap = signal<Record<string, MonitoredServiceData[]>>({});

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

  constructor() {
    this.parseMarkdown();
  }

  ngOnInit() {
    this.monitorService.getStatusPages().subscribe({
      next: data => {
        // Sort so 'platform-status' is always first
        const sorted = [...data].sort((a, b) => {
          if (a.slug === 'platform-status') return -1;
          if (b.slug === 'platform-status') return 1;
          return a.title.localeCompare(b.title);
        });
        this.statusPages.set(sorted);
        this.fetchAllIncidents(sorted);
        this.fetchAllServices(sorted);
        this.cdr.markForCheck();
      },
      error: err => console.error('Error fetching pages:', err),
    });
  }

  fetchAllIncidents(pages: StatusPageData[]) {
    pages.forEach(page => {
      this.monitorService.getIncidents(page.id).subscribe({
        next: incidents => {
          this.incidentsMap.update(map => ({ ...map, [page.id]: incidents }));
          this.cdr.markForCheck();
        },
        error: err => console.error(`Error fetching incidents for ${page.id}:`, err)
      });
    });
  }

  fetchAllServices(pages: StatusPageData[]) {
    pages.forEach(page => {
      this.monitorService.getServices(page.id).subscribe({
        next: services => {
          this.servicesMap.update(map => ({ ...map, [page.id]: services }));
          this.cdr.markForCheck();
        },
        error: err => console.error(`Error fetching services for ${page.id}:`, err)
      });
    });
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

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const contentArea = document.querySelector('.dashboard-main');
    if (contentArea) {
      contentArea.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
