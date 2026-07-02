import { Injectable, inject } from '@angular/core';
import { create, insert, search } from '@orama/orama';
import { FluxDialogService } from './flux-dialog.service';

export interface SearchItem {
  id: string;
  title: string;
  content: string;
  type: 'chapter' | 'status-page';
  url: string;
}

@Injectable({
  providedIn: 'root',
})
export class OramaSearchService {
  private db: any = null;
  private readonly fluxDialog = inject(FluxDialogService);

  constructor() {
    this.initializeDb();
  }

  private async initializeDb() {
    try {
      this.db = await create({
        schema: {
          id: 'string',
          title: 'string',
          content: 'string',
          type: 'string',
          url: 'string',
        },
      });
    } catch (e) {
      console.error('Failed to initialize Orama DB:', e);
    }
  }

  async clearAndIndex(items: SearchItem[]) {
    try {
      await this.initializeDb();
      if (!this.db) return;
      for (const item of items) {
        await insert(this.db, item);
      }
    } catch (e) {
      console.error('Failed to index items with Orama:', e);
    }
  }

  async search(query: string): Promise<SearchItem[]> {
    if (!this.db || !query.trim()) {
      return [];
    }
    try {
      const results = await search(this.db, {
        term: query,
        properties: ['title', 'content'],
        threshold: 0.1,
        tolerance: 2,
      });
      return results.hits.map(hit => hit.document as SearchItem);
    } catch (e) {
      console.error('Orama search error:', e);
      return [];
    }
  }

  openSearchDialog() {
    this.fluxDialog.openSearch();
  }
}
