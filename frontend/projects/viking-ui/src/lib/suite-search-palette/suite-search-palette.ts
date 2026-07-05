import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  OnInit,
  PLATFORM_ID,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  DEFAULT_SITE_URLS,
  type SiteDrakkarContext,
  type SiteUrls,
} from '../../../../../packages/viking-ui/src/lib/site-drakkar/site-drakkar.config';
import { registerVikingElements } from '../../../../../packages/viking-ui/src/web/index';

registerVikingElements();

/**
 * viking-suite-search-palette — thin Angular wrapper around `viking-suite-command-palette`.
 * Unified ⌘K command palette for deml.app with curated suite navigation.
 */
@Component({
  selector: 'viking-suite-search-palette',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <viking-suite-command-palette
      #palette
      [attr.context]="context()"
      [attr.app-url]="urls().app"
      [attr.marketing-url]="urls().marketing"
      [attr.backend-url]="urls().backend"
      [attr.placeholder]="placeholder()"
      [attr.global-shortcut]="bindShortcut() ? '' : 'false'"
    />
  `,
})
export class VikingSuiteSearchPalette implements OnInit, AfterViewInit {
  private readonly platformId = inject(PLATFORM_ID);

  readonly context = input<SiteDrakkarContext>('app');
  readonly urls = input<SiteUrls>(DEFAULT_SITE_URLS);
  readonly placeholder = input<string>('Search documentation, dashboard, settings…');
  readonly bindShortcut = input<boolean>(true);

  /** Optional callback when the palette opens (e.g. SearchService bridge). */
  readonly onRegister = input<(handlers: { open: () => void; close: () => void }) => void>();

  private readonly paletteRef = viewChild<ElementRef<HTMLElement>>('palette');

  ngOnInit(): void {
    this.onRegister()?.({
      open: () => this.openPalette(),
      close: () => this.closePalette(),
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const widgets = (globalThis as { DemlWidgets?: Record<string, unknown> }).DemlWidgets ?? {};
    (globalThis as { DemlWidgets?: Record<string, unknown> }).DemlWidgets = {
      ...widgets,
      openSearch: () => this.openPalette(),
      closeSearch: () => this.closePalette(),
    };
  }

  /** Opens the palette. */
  openPalette(): void {
    const el = this.paletteRef()?.nativeElement as HTMLElement & {
      openPalette?: () => void;
    };
    el?.openPalette?.();
  }

  /** Closes the palette and clears the query. */
  closePalette(): void {
    const el = this.paletteRef()?.nativeElement as HTMLElement & {
      closePalette?: () => void;
    };
    el?.closePalette?.();
  }
}
