import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * viking-table — clinical data table wrapper (Spartan-inspired).
 */
@Component({
  selector: 'viking-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'viking-table-wrap',
    '[class.viking-table-compact]': 'compact()',
  },
  template: `
    <table class="viking-table">
      <ng-content />
    </table>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        overflow-x: auto;
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius);
        background: var(--viking-surface);
        box-shadow: var(--viking-shadow-sm);
      }
      .viking-table {
        width: 100%;
        border-collapse: collapse;
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size);
        color: var(--viking-text);
      }
      :host ::ng-deep thead th {
        font-size: var(--viking-font-size-ui);
        font-weight: 700;
        text-align: left;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--viking-text-muted);
        background: color-mix(in srgb, var(--viking-bg) 2%, transparent);
        padding: var(--viking-space-2);
        border-bottom: 1px solid var(--viking-border-strong);
      }
      :host ::ng-deep tbody td {
        padding: var(--viking-space-2);
        border-bottom: 1px solid var(--viking-border);
        vertical-align: top;
      }
      :host ::ng-deep tbody tr:last-child td {
        border-bottom: none;
      }
      :host ::ng-deep tbody tr:hover td {
        background: var(--viking-accent-soft);
      }
      :host(.viking-table-compact) ::ng-deep thead th,
      :host(.viking-table-compact) ::ng-deep tbody td {
        padding: var(--viking-space-1) var(--viking-space-2);
      }
    `,
  ],
})
export class VikingTable {
  readonly compact = input(false);
}
