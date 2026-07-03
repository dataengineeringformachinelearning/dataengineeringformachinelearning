import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { VikingEmptyState } from '../empty-state/empty-state';
import { VikingSkeleton } from '../skeleton/skeleton';

/**
 * viking-table — clinical data table wrapper.
 */
@Component({
  selector: 'viking-table',
  imports: [VikingEmptyState, VikingSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'viking-table-wrap',
    '[class.viking-table-compact]': 'compact()',
    '[class.viking-table-striped]': 'striped()',
    '[class.viking-table-loading]': 'loading()',
    '[attr.aria-busy]': "loading() ? 'true' : null",
  },
  template: `
    @if (loading()) {
      <div class="viking-table-loading-state" aria-hidden="true">
        @for (row of [1, 2, 3, 4]; track row) {
          <viking-skeleton height="44px" />
        }
      </div>
    } @else if (emptyMessage()) {
      <viking-empty-state
        [heading]="emptyMessage()"
        [description]="emptyDescription()"
        icon="search-off"
      />
    } @else {
      <table class="viking-table">
        <ng-content />
      </table>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        overflow-x: auto;
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius-lg);
        background: var(--viking-surface);
        box-shadow: var(--viking-shadow-sm);
        transition: var(--viking-transition-colors);
      }
      .viking-table-loading-state {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-1);
        padding: var(--viking-space-2);
      }
      .viking-table {
        width: 100%;
        border-collapse: collapse;
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-sm);
        color: var(--viking-text);
      }
      :host ::ng-deep thead th {
        font-size: var(--viking-font-size-xs);
        font-weight: var(--viking-font-weight-bold);
        text-align: left;
        letter-spacing: var(--viking-letter-spacing-caps);
        text-transform: uppercase;
        color: var(--viking-text-muted);
        background: color-mix(in srgb, var(--viking-bg) 40%, var(--viking-surface));
        padding: var(--viking-space-1-5) var(--viking-space-2);
        border-bottom: 1px solid var(--viking-border-strong);
        white-space: nowrap;
      }
      :host ::ng-deep tbody td {
        padding: var(--viking-space-1-5) var(--viking-space-2);
        border-bottom: 1px solid var(--viking-border-subtle);
        vertical-align: middle;
        transition: background-color var(--viking-duration-fast) var(--viking-ease-default);
      }
      :host ::ng-deep tbody tr:last-child td {
        border-bottom: none;
      }
      :host ::ng-deep tbody tr:hover td {
        background: var(--viking-accent-soft);
      }
      :host(.viking-table-striped) ::ng-deep tbody tr:nth-child(even) td {
        background: color-mix(in srgb, var(--viking-surface-alt) 50%, transparent);
      }
      :host(.viking-table-striped) ::ng-deep tbody tr:nth-child(even):hover td {
        background: var(--viking-accent-soft);
      }
      :host(.viking-table-compact) ::ng-deep thead th,
      :host(.viking-table-compact) ::ng-deep tbody td {
        padding: var(--viking-space-1) var(--viking-space-2);
      }
      @media (max-width: 640px) {
        :host ::ng-deep thead th,
        :host ::ng-deep tbody td {
          padding: var(--viking-space-1);
          font-size: var(--viking-font-size-xs);
        }
      }
    `,
  ],
})
export class VikingTable {
  readonly compact = input(false);
  readonly striped = input(false);
  readonly loading = input(false);
  readonly emptyMessage = input<string>('');
  readonly emptyDescription = input<string>('');
}
