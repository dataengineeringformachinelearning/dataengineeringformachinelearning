import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { VikingIcon } from "../icon/icon";

export interface VikingPropertyFilterItem {
  key: string;
  value: string | number | boolean;
  operator?: string;
}

export interface VikingPropertyFilterOption {
  propertyKey: string;
  value: string;
  label?: string;
  operators?: string[];
}

/**
 * viking-property-filter — faceted filtering with property-value-operator grammar.
 * Based on Cloudscape Property Filter pattern, adapted for Viking-UI.
 * Used for filtering pipelines, incidents, endpoints by status, priority, etc.
 */
@Component({
  selector: "viking-property-filter",
  standalone: true,
  imports: [FormsModule, VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="viking-property-filter">
      <div class="viking-property-filter__input-wrapper">
        <viking-icon
          class="viking-property-filter__icon"
          name="search"
          [size]="18"
          [ariaHidden]="true"
        />
        <input
          #filterInput
          type="text"
          class="viking-property-filter__input"
          [placeholder]="placeholder()"
          [(ngModel)]="query"
          (ngModelChange)="onQueryChange($event)"
          autocomplete="off"
        />
      </div>
      @if (tags().length > 0) {
        <div class="viking-property-filter__tags">
          @for (tag of tags(); track $index) {
            <span class="viking-property-filter__tag">
              <span class="viking-property-filter__tag-key">{{ tag.key }}</span>
              <span class="viking-property-filter__tag-separator">:</span>
              <span class="viking-property-filter__tag-value">{{
                tag.value
              }}</span>
              <button
                type="button"
                class="viking-property-filter__tag-remove"
                aria-label="Remove filter"
                (click)="removeTag($index)"
              >
                <viking-icon name="x" [size]="14" />
              </button>
            </span>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host(.viking-property-filter-wrapper) {
        display: block;
        font-family: var(--viking-font-family);
      }
      .viking-property-filter {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-1);
      }
      .viking-property-filter__input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }
      .viking-property-filter__icon {
        position: absolute;
        left: var(--viking-space-2);
        color: var(--viking-text-muted);
        pointer-events: none;
      }
      .viking-property-filter__input {
        width: 100%;
        padding-left: calc(var(--viking-space-2) + 24px);
        padding-right: var(--viking-space-2);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size);
        color: var(--viking-text);
        background: var(--viking-surface-input);
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius);
        height: var(--viking-control-height);
        transition: var(--viking-transition-interactive);
      }
      .viking-property-filter__input:focus {
        outline: none;
        border-color: var(--viking-ring);
        box-shadow: 0 0 0 2px
          color-mix(in srgb, var(--viking-ring) 40%, transparent);
      }
      .viking-property-filter__tags {
        display: flex;
        flex-wrap: wrap;
        gap: var(--viking-space-1);
        align-items: center;
      }
      .viking-property-filter__tag {
        display: inline-flex;
        align-items: center;
        gap: var(--viking-space-0-5);
        padding: var(--viking-space-0-5) var(--viking-space-1);
        background: var(--viking-accent-soft);
        border: 1px solid var(--viking-border-subtle);
        border-radius: var(--viking-radius-sm);
        font-size: var(--viking-font-size-sm);
        color: var(--viking-text);
      }
      .viking-property-filter__tag-key {
        font-weight: var(--viking-font-weight-semibold);
      }
      .viking-property-filter__tag-separator {
        color: var(--viking-text-muted);
      }
      .viking-property-filter__tag-remove {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        border: none;
        background: transparent;
        color: var(--viking-text-muted);
        cursor: pointer;
        padding: 0;
        border-radius: var(--viking-radius-sm);
        transition: var(--viking-transition-interactive);
      }
      .viking-property-filter__tag-remove:hover {
        color: var(--viking-text);
        background: var(--viking-accent);
      }
    `,
  ],
})
export class VikingPropertyFilter {
  readonly placeholder = input<string>("Search by property key:value");
  readonly options = input<VikingPropertyFilterOption[]>([]);
  readonly allowFreeform = input<boolean>(true);
  readonly enableCaret = input<boolean>(true);

  readonly query = model<string>("");
  readonly items = model<VikingPropertyFilterItem[]>([]);

  readonly filterChange = output<VikingPropertyFilterItem[]>();

  protected readonly tags = computed(() => this.items());

  protected onQueryChange(value: string): void {
    // Parse query and extract property filters
    if (value.match(/^[a-zA-Z0-9_-]+:/)) {
      const match = value.match(/^([a-zA-Z0-9_-]+):\s*(.+)$/);
      if (match) {
        const [, key, val] = match;
        this.items.update((items) => [...items, { key, value: val }]);
        this.query.set("");
        this.filterChange.emit(this.items());
      }
    }
  }

  protected removeTag(index: number): void {
    this.items.update((items) => items.filter((_, i) => i !== index));
    this.filterChange.emit(this.items());
  }
}
