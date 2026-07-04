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
import { VikingIcon } from '../icon/icon';

/**
 * viking-search-palette — command-palette style search overlay.
 * Project custom result lists into the body slot.
 */
@Component({
  selector: 'viking-search-palette',
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown.escape)': 'close()' },
  template: `
    @if (open()) {
      <div
        class="viking-search-palette-backdrop"
        role="presentation"
        tabindex="-1"
        (click)="close()"
        (keydown.escape)="close()"
      >
        <div
          class="viking-search-palette"
          role="dialog"
          aria-label="Search"
          tabindex="-1"
          (click)="$event.stopPropagation()"
          (keydown)="$event.stopPropagation()"
        >
          <div class="viking-search-palette-header">
            <viking-icon name="search" [size]="24" />
            <input
              #queryInput
              type="text"
              class="viking-search-palette-input"
              [placeholder]="placeholder()"
              [value]="query()"
              [attr.aria-label]="placeholder()"
              (input)="onQueryInput($event)"
            />
            <button
              type="button"
              class="viking-search-palette-close"
              aria-label="Close search"
              (click)="close()"
            >
              <viking-icon name="x" [size]="20" />
            </button>
          </div>
          <div
            class="viking-search-palette-body"
            tabindex="-1"
            (keydown)="paletteKeydown.emit($event)"
          >
            <ng-content />
          </div>
          <footer class="viking-search-palette-footer">
            <ng-content select="[vikingSearchPaletteFooter]" />
          </footer>
        </div>
      </div>
    }
  `,
  styleUrl: './search-palette.scss',
})
export class VikingSearchPalette {
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
