import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { FluxIcon } from '../icon/icon';

/**
 * flux-search-palette — command-palette style search overlay.
 * Project custom result lists into the body slot.
 */
@Component({
  selector: 'flux-search-palette',
  imports: [FluxIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown.escape)': 'close()' },
  template: `
    @if (open()) {
      <div
        class="flux-search-palette-backdrop"
        role="presentation"
        tabindex="-1"
        (click)="close()"
        (keydown.escape)="close()"
      >
        <div
          class="flux-search-palette"
          role="dialog"
          aria-label="Search"
          tabindex="-1"
          (click)="$event.stopPropagation()"
          (keydown)="$event.stopPropagation()"
        >
          <div class="flux-search-palette-header">
            <flux-icon name="search" [size]="24" />
            <input
              #queryInput
              type="text"
              class="flux-search-palette-input"
              [placeholder]="placeholder()"
              [value]="query()"
              [attr.aria-label]="placeholder()"
              (input)="onQueryInput($event)"
            />
            <button
              type="button"
              class="flux-search-palette-close"
              aria-label="Close search"
              (click)="close()"
            >
              <flux-icon name="x" [size]="20" />
            </button>
          </div>
          <div
            class="flux-search-palette-body"
            tabindex="-1"
            (keydown)="paletteKeydown.emit($event)"
          >
            <ng-content />
          </div>
          <footer class="flux-search-palette-footer">
            <ng-content select="[fluxSearchPaletteFooter]" />
          </footer>
        </div>
      </div>
    }
  `,
  styleUrl: './search-palette.scss',
})
export class FluxSearchPalette {
  readonly open = model<boolean>(false);
  readonly query = model<string>('');
  readonly placeholder = input<string>('Search...');
  readonly paletteKeydown = output<KeyboardEvent>();

  private readonly queryInput = viewChild<ElementRef<HTMLInputElement>>('queryInput');

  constructor() {
    effect(() => {
      if (this.open()) {
        queueMicrotask(() => this.queryInput()?.nativeElement.focus());
      }
    });
  }

  protected onQueryInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected close(): void {
    this.open.set(false);
  }
}
