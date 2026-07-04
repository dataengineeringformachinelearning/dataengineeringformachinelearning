import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Opens the Viking-UI command palette (Angular shell or static widget). */
@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly platformId = inject(PLATFORM_ID);
  private openPaletteHandler: (() => void) | null = null;
  private closePaletteHandler: (() => void) | null = null;

  /** Registers handlers from `viking-suite-search-palette` when mounted in deml.app. */
  registerPaletteHandlers(handlers: { open: () => void; close: () => void }): void {
    this.openPaletteHandler = handlers.open;
    this.closePaletteHandler = handlers.close;
  }

  open(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    if (this.openPaletteHandler) {
      this.openPaletteHandler();
      return;
    }
    const widgets = (globalThis as { DemlWidgets?: { openSearch?: () => void } }).DemlWidgets;
    widgets?.openSearch?.();
  }

  close(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    if (this.closePaletteHandler) {
      this.closePaletteHandler();
      return;
    }
    const widgets = (globalThis as { DemlWidgets?: { closeSearch?: () => void } }).DemlWidgets;
    widgets?.closeSearch?.();
  }

  toggle(): void {
    this.open();
  }
}
