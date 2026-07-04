import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Opens the Algolia command-palette search overlay (shared static widget). */
@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly platformId = inject(PLATFORM_ID);

  open(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const widgets = (globalThis as { DemlWidgets?: { openSearch?: () => void } }).DemlWidgets;
    widgets?.openSearch?.();
  }

  close(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const widgets = (globalThis as { DemlWidgets?: { closeSearch?: () => void } }).DemlWidgets;
    widgets?.closeSearch?.();
  }
}
