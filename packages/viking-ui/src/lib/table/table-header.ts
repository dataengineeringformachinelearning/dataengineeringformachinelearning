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

/** Primitive cell values for table row records (not the row component). */
export type VikingTableCellValue =
  | string
  | number
  | boolean
  | bigint
  | null
  | undefined;

/** Data row for table consumers — distinct from the `VikingTableRow` component. */
export type VikingTableRecord = {
  readonly id: string;
} & Record<string, VikingTableCellValue>;

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
        <th class="viking-table-header__select" scope="col">
          <input
            type="checkbox"
            class="viking-table-header__checkbox"
            [checked]="allSelected()"
            [indeterminate]="someSelected()"
            (change)="toggleSelectAll($event)"
            aria-label="Select all rows"
          />
        </th>
      }
      @for (column of columns(); track column.id) {
        <th
          class="viking-table-header__cell"
          scope="col"
          [style.width]="column.width"
          [class.viking-table-header__cell--sortable]="column.sortable"
          [attr.aria-sort]="ariaSort(column.id)"
        >
          @if (column.sortable) {
            <button
              type="button"
              class="viking-table-header__sort-button"
              [attr.aria-label]="sortLabel(column)"
              (click)="sortColumn(column.id)"
            >
              <span>{{ column.label }}</span>
              <viking-icon
                class="viking-table-header__sort-icon"
                [class.viking-table-header__sort-icon--active]="
                  sortColumnId() === column.id && !!sortDirection()
                "
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
        min-height: var(--viking-touch-target-min, 44px);
        padding: 0 var(--viking-space-1);
        transition: var(--viking-transition);
      }
      .viking-table-header__sort-button:hover {
        color: var(--viking-text);
      }
      .viking-table-header__sort-button:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
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
  readonly sortColumnId = input<string | null>(null);
  readonly sortDirection = input<VikingSortDirection>(null);

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
    if (this.sortColumnId() !== columnId) return "chevron-up";
    return this.sortDirection() === "desc" ? "chevron-down" : "chevron-up";
  }

  protected ariaSort(columnId: string): string | null {
    if (this.sortColumnId() !== columnId || !this.sortDirection()) return null;
    return this.sortDirection() === "desc" ? "descending" : "ascending";
  }

  protected sortLabel(column: VikingColumn): string {
    if (this.sortColumnId() !== column.id || !this.sortDirection()) {
      return `Sort by ${column.label}`;
    }
    const next = this.sortDirection() === "asc" ? "descending" : "ascending";
    return `Sort by ${column.label}, currently ${this.sortDirection() === "asc" ? "ascending" : "descending"}; activate for ${next}`;
  }

  protected sortColumn(columnId: string): void {
    let direction: VikingSortDirection = "asc";
    if (this.sortColumnId() === columnId) {
      direction =
        this.sortDirection() === "asc"
          ? "desc"
          : this.sortDirection() === "desc"
            ? null
            : "asc";
    }
    this.sortChange.emit({ column: columnId, direction });
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
            [attr.aria-label]="selected() ? 'Deselect row' : 'Select row'"
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
            [attr.aria-label]="expanded() ? 'Collapse row' : 'Expand row'"
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
        width: var(--viking-touch-target-min, 44px);
        padding: var(--viking-space-1);
      }
      .viking-table-row__cell--expandable {
        cursor: pointer;
      }
      .viking-table-row__expand-trigger {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        /* WCAG 2.5.8 + suite touch floor */
        width: var(--viking-touch-target-min, 44px);
        height: var(--viking-touch-target-min, 44px);
        min-width: var(--viking-touch-target-min, 44px);
        min-height: var(--viking-touch-target-min, 44px);
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
      .viking-table-row__expand-trigger:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
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
