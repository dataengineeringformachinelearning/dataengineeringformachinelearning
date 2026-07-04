import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  inject,
  viewChild,
} from '@angular/core';
import { VikingSuiteSearchPalette } from '@dataengineeringformachinelearning/viking-ui';
import { SearchService } from '../../services/search.service';
import { environment } from '../../../environments/environment';

/** deml.app command palette host — wires SearchService to viking-suite-search-palette. */
@Component({
  selector: 'app-command-palette',
  imports: [VikingSuiteSearchPalette],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <viking-suite-search-palette
      context="app"
      [urls]="siteUrls"
      placeholder="Search documentation, dashboard, settings…"
    />
  `,
})
export class CommandPalette implements AfterViewInit {
  private readonly searchService = inject(SearchService);
  private readonly palette = viewChild(VikingSuiteSearchPalette);

  protected readonly siteUrls = {
    app: environment.frontendUrl ?? 'https://deml.app',
    marketing: environment.marketingUrl ?? 'https://dataengineeringformachinelearning.com',
    backend: environment.backendUrl ?? 'https://backend.deml.app',
  };

  ngAfterViewInit(): void {
    const palette = this.palette();
    if (!palette) {
      return;
    }
    this.searchService.registerPaletteHandlers({
      open: () => palette.openPalette(),
      close: () => palette.closePalette(),
    });
  }
}
