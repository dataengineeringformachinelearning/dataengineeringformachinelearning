import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { VikingIcon } from '../icon/icon';

/**
 * viking-pagination — page navigation.
 */
@Component({
  selector: 'viking-pagination',
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="viking-pagination" aria-label="Pagination">
      <button
        type="button"
        class="viking-page-btn"
        aria-label="Previous page"
        [disabled]="page() <= 1"
        (click)="goTo(page() - 1)"
      >
        <viking-icon name="chevron-left" [size]="18" />
      </button>
      @for (item of pageItems(); track $index) {
        @if (item === null) {
          <span class="viking-page-ellipsis" aria-hidden="true">…</span>
        } @else {
          <button
            type="button"
            class="viking-page-btn"
            [class.viking-page-current]="item === page()"
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
        class="viking-page-btn"
        aria-label="Next page"
        [disabled]="page() >= totalPages()"
        (click)="goTo(page() + 1)"
      >
        <viking-icon name="chevron-right" [size]="18" />
      </button>
    </nav>
  `,
  styles: [
    `
      .viking-pagination {
        display: flex;
        align-items: center;
        gap: calc(var(--viking-space-1) / 2);
        flex-wrap: wrap;
      }
      .viking-page-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: var(--viking-control-height-sm);
        height: var(--viking-control-height-sm);
        padding: 0 var(--viking-space-1);
        border: 1px solid transparent;
        border-radius: var(--viking-radius);
        background: transparent;
        color: var(--viking-text);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size);
        font-weight: 500;
        cursor: pointer;
        transition: var(--viking-transition);
        font-variant-numeric: tabular-nums;
      }
      .viking-page-btn:hover:not(:disabled):not(.viking-page-current) {
        background: var(--viking-accent-soft);
      }
      .viking-page-btn:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: 1px;
      }
      .viking-page-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .viking-page-current {
        background: var(--viking-accent);
        border-color: var(--viking-accent);
        color: var(--viking-accent-content);
        /* >= 18.67px bold qualifies as WCAG large text (3:1 on accent fill). */
        font-size: calc(var(--viking-font-size) * 1.05);
        font-weight: 700;
      }
      .viking-page-ellipsis {
        color: var(--viking-text-muted);
        padding: 0 var(--viking-space-1);
        font-size: var(--viking-font-size);
      }
    `,
  ],
})
export class VikingPagination {
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
