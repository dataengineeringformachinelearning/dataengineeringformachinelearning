import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
} from "@angular/core";
import { VikingIcon } from "../icon/icon";
import { VikingEmptyState } from "../empty-state/empty-state";
import { VikingSkeleton } from "../skeleton/skeleton";

export interface VikingColumn {
  id: string;
  label: string;
  sortable?: boolean;
  width?: string;
}

export interface VikingTableRow {
  id: string;
  [key: string]: unknown;
}

export type VikingSortDirection = "asc" | "desc" | null;

/**
 * viking-table-header — sortable column headers with selection support.
 */
@Component({
  selector: "viking-table-header",
  standalone: true,
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tr class="viking-table-header">
      @if (selectable()) {
        <th class="viking-table-header__select">
          <input
            type="checkbox"
            class="viking-table-header__checkbox"
            [checked]="allSelected()"
            [indeterminate]="someSelected()"
            (change)="toggleSelectAll($event)"
          />
        </th>
      }
      @for (column of columns(); track column.id) {
        <th
          class="viking-table-header__cell"
          [style.width]="column.width"
          [class.viking-table-header__cell--sortable]="column.sortable"
        >
          @if (column.sortable) {
            <button
              type="button"
              class="viking-table-header__sort-button"
              (click)="sortColumn(column.id)"
            >
              <span>{{ column.label }}</span>
              <viking-icon
                class="viking-table-header__sort-icon"
                [name]="getSortIcon(column.id)"
                [size]="16"
              />
            </button>
          } @else {
            {{ column.label }}
          }
        </th>
      }
    </tr>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      .viking-table-header__select {
        padding: var(--viking-space-1) var(--viking-space-2);
        width: 44px;
      }
      .viking-table-header__checkbox {
        width: 16px;
        height: 16px;
        accent-color: var(--viking-accent);
      }
      .viking-table-header__cell {
        padding: var(--viking-space-1) var(--viking-space-2);
        font-size: var(--viking-font-size-xs);
        font-weight: var(--viking-font-weight-bold);
        letter-spacing: var(--viking-letter-spacing-caps);
        text-transform: uppercase;
        color: var(--viking-text-muted);
        background: color-mix(
          in srgb,
          var(--viking-bg) 40%,
          var(--viking-surface)
        );
        border-bottom: 1px solid var(--viking-border-strong);
        white-space: nowrap;
      }
      .viking-table-header__cell--sortable {
        cursor: pointer;
      }
      .viking-table-header__sort-button {
        display: inline-flex;
        align-items: center;
        gap: var(--viking-space-1);
        background: transparent;
        border: none;
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-xs);
        font-weight: var(--viking-font-weight-bold);
        letter-spacing: var(--viking-letter-spacing-caps);
        text-transform: uppercase;
        color: var(--viking-text-muted);
        cursor: pointer;
        padding: 0;
        transition: var(--viking-transition);
      }
      .viking-table-header__sort-button:hover {
        color: var(--viking-text);
      }
      .viking-table-header__sort-icon {
        opacity: 0.4;
        transition: opacity var(--viking-duration-fast);
      }
      .viking-table-header__sort-button:hover .viking-table-header__sort-icon {
        opacity: 1;
      }
      .viking-table-header__sort-icon--active {
        opacity: 1;
        color: var(--viking-accent);
      }
    `,
  ],
})
export class VikingTableHeader {
  readonly columns = input<VikingColumn[]>([]);
  readonly selectable = input<boolean>(false);
  readonly allSelected = input<boolean>(false);
  readonly someSelected = input<boolean>(false);

  readonly selectionChange = output<boolean>();
  readonly sortChange = output<{
    column: string;
    direction: VikingSortDirection;
  }>();

  protected toggleSelectAll(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectionChange.emit(input.checked);
  }

  protected getSortIcon(columnId: string): string {
    return "chevron-up";
  }

  protected sortColumn(columnId: string): void {
    this.sortChange.emit({ column: columnId, direction: "asc" });
  }
}

/** viking-table-row — row with optional selection and expand. */
@Component({
  selector: "viking-table-row",
  standalone: true,
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tr
      class="viking-table-row"
      [class.viking-table-row--selected]="selected()"
    >
      @if (selectable()) {
        <td class="viking-table-row__select">
          <input
            type="checkbox"
            class="viking-table-row__checkbox"
            [checked]="selected()"
            (change)="selected.update((s) => !s)"
          />
        </td>
      }
      <td
        class="viking-table-row__cell viking-table-row__cell--expand"
        [class.viking-table-row__cell--expandable]="expandable()"
      >
        @if (expandable()) {
          <button
            type="button"
            class="viking-table-row__expand-trigger"
            [attr.aria-expanded]="expanded()"
            (click)="expanded.update((value) => !value)"
          >
            <viking-icon
              [name]="expanded() ? 'chevron-down' : 'chevron-right'"
              [size]="16"
            />
          </button>
        }
      </td>
      <ng-content />
    </tr>
    @if (expandable() && expanded()) {
      <tr class="viking-table-row__expand">
        <td [attr.colspan]="expandColspan()">
          <div class="viking-table-row__expand-content">
            <ng-content select="[vikingRowExpand]" />
          </div>
        </td>
      </tr>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      .viking-table-row {
        transition: background-color var(--viking-duration-fast);
      }
      .viking-table-row:hover {
        background: var(--viking-surface-alt);
      }
      .viking-table-row--selected {
        background: var(--viking-accent-soft);
      }
      .viking-table-row__select {
        padding: var(--viking-space-1) var(--viking-space-2);
        width: 44px;
      }
      .viking-table-row__checkbox {
        width: 16px;
        height: 16px;
        accent-color: var(--viking-accent);
      }
      .viking-table-row__cell {
        padding: var(--viking-space-1) var(--viking-space-2);
        font-size: var(--viking-font-size);
        color: var(--viking-text);
        border-bottom: 1px solid var(--viking-border-subtle);
      }
      .viking-table-row__cell--expand {
        width: 32px;
        padding: var(--viking-space-1);
      }
      .viking-table-row__cell--expandable {
        cursor: pointer;
      }
      .viking-table-row__expand-trigger {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border: none;
        background: transparent;
        color: var(--viking-text-muted);
        cursor: pointer;
        padding: 0;
        border-radius: var(--viking-radius-sm);
        transition: var(--viking-transition-interactive);
      }
      .viking-table-row__expand-trigger:hover {
        color: var(--viking-text);
        background: var(--viking-accent-soft);
      }
      .viking-table-row__expand {
        background: var(--viking-surface-alt);
      }
      .viking-table-row__expand-content {
        padding: var(--viking-space-2);
      }
    `,
  ],
})
export class VikingTableRow {
  readonly selectable = input<boolean>(false);
  readonly selected = model<boolean>(false);
  readonly expandable = input<boolean>(false);
  readonly expanded = model<boolean>(false);

  readonly expandColspan = input<number>(10);
}
