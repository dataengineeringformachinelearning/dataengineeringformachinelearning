import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  model,
  output,
  signal,
} from "@angular/core";
import { VikingControl, provideVikingCva } from "../core/cva";
import { VikingIcon } from "../icon/icon";
import { vikingUid } from "../../core/uid";

/**
 * viking-autocomplete — text input with filtered suggestions
 *. ControlValueAccessor-compatible.
 */
@Component({
  selector: "viking-autocomplete",
  imports: [VikingIcon],
  providers: [provideVikingCva(VikingAutocomplete)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "(document:click)": "onDocumentClick($event)" },
  template: `
    <div class="viking-control viking-autocomplete-shell">
      <viking-icon class="viking-autocomplete-icon" name="search" [size]="20" />
      <input
        type="text"
        role="combobox"
        [placeholder]="placeholder()"
        [value]="value()"
        [disabled]="disabled() || formDisabled()"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="panelId"
        [attr.aria-label]="label() || placeholder() || 'Autocomplete'"
        aria-autocomplete="list"
        (input)="onInput($event)"
        (focus)="open.set(true)"
        (keydown)="onKeydown($event)"
        (blur)="onTouched()"
      />
    </div>
    @if (open() && filtered().length > 0) {
      <div class="viking-autocomplete-panel" role="listbox" [id]="panelId">
        @for (item of filtered(); track item; let index = $index) {
          <button
            type="button"
            role="option"
            class="viking-autocomplete-option"
            [class.viking-active]="index === activeIndex()"
            [attr.aria-selected]="index === activeIndex()"
            (mousedown)="$event.preventDefault()"
            (click)="pick(item)"
            (mouseenter)="activeIndex.set(index)"
          >
            {{ item }}
          </button>
        }
      </div>
    }
  `,
  styles: [
    `
      :host {
        position: relative;
        display: block;
      }
      .viking-autocomplete-shell {
        display: flex;
        align-items: center;
        gap: var(--viking-space-1);
        min-height: var(--viking-control-height);
        padding: 0 var(--viking-space-2);
        background: var(--viking-surface);
        border: 1px solid var(--viking-border-strong);
        border-radius: var(--viking-radius);
        box-shadow: var(--viking-shadow-sm);
        transition: var(--viking-transition);
      }
      .viking-autocomplete-shell:focus-within {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-autocomplete-icon {
        color: var(--viking-text-muted);
      }
      input {
        flex: 1;
        min-width: 0;
        border: none;
        outline: none;
        background: transparent;
        color: var(--viking-text);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size);
      }
      input::placeholder {
        color: var(--viking-text-muted);
      }
      .viking-autocomplete-panel {
        position: absolute;
        top: calc(100% + var(--viking-space-1));
        left: 0;
        right: 0;
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-0-5);
        margin: 0;
        padding: var(--viking-space-1);
        background: var(--viking-surface);
        border: 1px solid var(--viking-border-strong);
        border-radius: var(--viking-radius);
        box-shadow: var(--viking-shadow-md);
        z-index: var(--viking-z-overlay);
        max-height: 288px;
        overflow: auto;
      }
      .viking-autocomplete-option {
        padding: var(--viking-space-1);
        border: none;
        background: transparent;
        text-align: left;
        width: 100%;
        border-radius: calc(var(--viking-radius) / 1.5);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size);
        color: var(--viking-text);
        cursor: pointer;
      }
      .viking-autocomplete-option:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: -2px;
      }
      .viking-active {
        background: var(--viking-accent-soft);
      }
    `,
  ],
})
export class VikingAutocomplete extends VikingControl<string> {
  readonly suggestions = input.required<string[]>();
  readonly value = model<string>("");
  readonly placeholder = input<string>("");
  readonly label = input<string>("");
  readonly disabled = input<boolean>(false);

  readonly selected = output<string>();

  constructor(private readonly host: ElementRef<HTMLElement>) {
    super();
  }

  protected readonly open = signal(false);
  protected readonly activeIndex = signal(0);
  protected readonly panelId = vikingUid("viking-autocomplete-panel");

  protected readonly filtered = computed(() => {
    const query = this.value().toLowerCase().trim();
    if (!query) {
      return this.suggestions();
    }
    return this.suggestions().filter((item) =>
      item.toLowerCase().includes(query),
    );
  });

  writeValue(value: string): void {
    this.value.set(value ?? "");
  }

  protected onInput = (event: Event): void => {
    const next = (event.target as HTMLInputElement).value;
    this.value.set(next);
    this.onChange(next);
    this.open.set(true);
    this.activeIndex.set(0);
  };

  protected pick = (item: string): void => {
    this.value.set(item);
    this.onChange(item);
    this.selected.emit(item);
    this.open.set(false);
  };

  protected onKeydown = (event: KeyboardEvent): void => {
    if (!this.open()) {
      return;
    }
    const items = this.filtered();
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        this.activeIndex.update((index) =>
          Math.min(items.length - 1, index + 1),
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        this.activeIndex.update((index) => Math.max(0, index - 1));
        break;
      case "Enter":
        if (items[this.activeIndex()]) {
          event.preventDefault();
          this.pick(items[this.activeIndex()]);
        }
        break;
      case "Escape":
        this.open.set(false);
        break;
    }
  };

  protected onDocumentClick = (event: Event): void => {
    if (
      this.open() &&
      !this.host.nativeElement.contains(event.target as Node)
    ) {
      this.open.set(false);
    }
  };
}
