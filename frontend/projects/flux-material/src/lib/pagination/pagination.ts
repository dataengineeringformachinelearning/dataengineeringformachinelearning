import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { FluxIcon } from '../icon/icon';

/**
 * flux-pagination — page navigation (https://fluxui.dev/components/pagination).
 */
@Component({
  selector: 'flux-pagination',
  imports: [FluxIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="flux-pagination" aria-label="Pagination">
      <button
        type="button"
        class="flux-page-btn"
        aria-label="Previous page"
        [disabled]="page() <= 1"
        (click)="goTo(page() - 1)"
      >
        <flux-icon name="chevron-left" [size]="18" />
      </button>
      @for (item of pageItems(); track $index) {
        @if (item === null) {
          <span class="flux-page-ellipsis" aria-hidden="true">…</span>
        } @else {
          <button
            type="button"
            class="flux-page-btn"
            [class.flux-page-current]="item === page()"
            [attr.aria-current]="item === page() ? 'page' : null"
            [attr.aria-label]="'Page ' + item"
            (click)="goTo(item)"
          >
            {{ item }}
          </button>
        }
      }
      <button
        type="button"
        class="flux-page-btn"
        aria-label="Next page"
        [disabled]="page() >= totalPages()"
        (click)="goTo(page() + 1)"
      >
        <flux-icon name="chevron-right" [size]="18" />
      </button>
    </nav>
  `,
  styles: [
    `
      .flux-pagination {
        display: flex;
        align-items: center;
        gap: calc(var(--flux-space-1) / 2);
        flex-wrap: wrap;
      }
      .flux-page-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: var(--flux-control-height-sm);
        height: var(--flux-control-height-sm);
        padding: 0 var(--flux-space-1);
        border: 1px solid transparent;
        border-radius: var(--flux-radius);
        background: transparent;
        color: var(--flux-text);
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
        font-weight: 500;
        cursor: pointer;
        transition: var(--flux-transition);
        font-variant-numeric: tabular-nums;
      }
      .flux-page-btn:hover:not(:disabled):not(.flux-page-current) {
        background: var(--flux-accent-soft);
      }
      .flux-page-btn:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: 1px;
      }
      .flux-page-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .flux-page-current {
        background: var(--flux-accent);
        border-color: var(--flux-accent);
        color: var(--flux-accent-content);
        font-weight: 600;
      }
      .flux-page-ellipsis {
        color: var(--flux-text-muted);
        padding: 0 var(--flux-space-1);
        font-size: var(--flux-font-size);
      }
    `,
  ],
})
export class FluxPagination {
  readonly page = model<number>(1);
  readonly totalPages = input.required<number>();

  /** Windowed page list with null entries marking ellipses. */
  protected readonly pageItems = computed<(number | null)[]>(() => {
    const total = this.totalPages();
    const current = this.page();
    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }
    const pages = new Set<number>([1, 2, total - 1, total, current - 1, current, current + 1]);
    const sorted = [...pages].filter(value => value >= 1 && value <= total).sort((a, b) => a - b);
    const items: (number | null)[] = [];
    let previous = 0;
    for (const value of sorted) {
      if (value - previous > 1) {
        items.push(null);
      }
      items.push(value);
      previous = value;
    }
    return items;
  });

  protected goTo = (target: number): void => {
    const clamped = Math.min(this.totalPages(), Math.max(1, target));
    this.page.set(clamped);
  };
}
