import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  model,
  signal,
} from "@angular/core";
import { VikingControl, provideVikingCva } from "../core/cva";
import { VikingIcon } from "../icon/icon";
import { VikingSelectOption } from "../../core/types";

export type VikingSelectWidth = "full" | "half";

/**
 * viking-select — custom listbox select.
 * ControlValueAccessor-compatible with full keyboard support.
 */
@Component({
  selector: "viking-select",
  imports: [VikingIcon],
  providers: [provideVikingCva(VikingSelect)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "(document:click)": "onDocumentClick($event)",
    "[class.viking-select-full]": "width() === 'full'",
    "[class.viking-select-half]": "width() === 'half'",
  },
  template: `
    <button
      type="button"
      class="viking-control viking-select-trigger"
      [disabled]="disabled() || formDisabled()"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="label() || placeholder()"
      aria-haspopup="listbox"
      (click)="toggle()"
      (keydown)="onKeydown($event)"
    >
      <span
        class="viking-select-value"
        [class.viking-select-placeholder]="!selectedLabel()"
      >
        {{ selectedLabel() || placeholder() }}
      </span>
      <viking-icon
        [name]="open() ? 'chevron-up' : 'chevron-down'"
        [size]="18"
      />
    </button>
    @if (open()) {
      <div
        class="viking-select-panel"
        role="listbox"
        [attr.aria-label]="label() || placeholder()"
      >
        @for (option of options(); track option.label; let index = $index) {
          <button
            type="button"
            role="option"
            class="viking-select-option"
            [class.viking-active]="index === activeIndex()"
            [class.viking-selected]="option.value === value()"
            [disabled]="option.disabled"
            [attr.aria-selected]="option.value === value()"
            (click)="pick(option)"
            (mouseenter)="activeIndex.set(index)"
          >
            <span class="viking-select-option-label">{{ option.label }}</span>
            @if (option.value === value()) {
              <viking-icon name="check" [size]="16" />
            }
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
        min-width: 0;
      }
      :host(.viking-select-full) {
        width: 100%;
      }
      :host(.viking-select-half) {
        width: 100%;
        max-width: var(--viking-select-half-max-width, min(100%, 24rem));
      }
      .viking-select-value {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .viking-select-trigger {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viking-space-1);
        width: 100%;
        min-height: var(--viking-control-height);
        padding: 0 var(--viking-space-2);
        background: var(--viking-surface);
        border: 1px solid var(--viking-border-strong);
        border-radius: var(--viking-radius);
        box-shadow: var(--viking-shadow-sm);
        color: var(--viking-text);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size);
        cursor: pointer;
        transition: var(--viking-transition-interactive);
        text-align: left;
      }
      .viking-select-trigger:hover:not(:disabled) {
        border-color: var(--viking-accent-strong);
        box-shadow: var(--viking-shadow-md);
      }
      .viking-select-trigger:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-select-trigger:disabled {
        opacity: var(--viking-state-disabled-opacity);
        cursor: not-allowed;
      }
      .viking-select-placeholder {
        color: var(--viking-text-muted);
      }
      .viking-select-panel {
        position: absolute;
        top: calc(100% + var(--viking-space-0-5));
        left: 0;
        width: 100%;
        min-width: 100%;
        max-width: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-0-5);
        margin: 0;
        padding: var(--viking-space-1);
        background-color: var(
          --viking-select-panel-bg,
          var(--viking-surface-raised)
        );
        border: 1px solid var(--viking-border-strong);
        border-radius: var(--viking-radius);
        box-shadow: var(--viking-shadow-lg);
        z-index: var(--viking-z-overlay);
        max-height: 315px;
        overflow: auto;
        isolation: isolate;
        animation: viking-slide-up var(--viking-duration-fast)
          var(--viking-ease-default);
      }
      .viking-select-option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viking-space-1);
        padding: var(--viking-space-1) var(--viking-space-2);
        border: none;
        background: transparent;
        text-align: left;
        width: 100%;
        min-width: 0;
        border-radius: var(--viking-radius-sm);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-sm);
        color: var(--viking-text);
        cursor: pointer;
        transition: var(--viking-transition-interactive);
      }
      .viking-select-option-label {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .viking-select-option:disabled {
        opacity: var(--viking-state-disabled-opacity);
        cursor: not-allowed;
      }
      .viking-select-option:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: -2px;
      }
      .viking-active {
        background: var(--viking-accent-soft);
        color: var(--viking-text);
      }
      .viking-selected {
        font-weight: var(--viking-font-weight-semibold);
        color: var(--viking-accent-strong);
        background: color-mix(
          in srgb,
          var(--viking-accent) 14%,
          var(--viking-select-panel-bg, var(--viking-surface-raised))
        );
      }
    `,
  ],
})
export class VikingSelect extends VikingControl<unknown> {
  readonly options = input.required<VikingSelectOption[]>();
  readonly value = model<unknown>(null);
  readonly placeholder = input<string>("Select…");
  readonly label = input<string>("");
  readonly disabled = input<boolean>(false);
  readonly width = input<VikingSelectWidth>("half");

  constructor(private readonly host: ElementRef<HTMLElement>) {
    super();
  }

  protected readonly open = signal(false);
  protected readonly activeIndex = signal(0);

  protected readonly selectedLabel = computed(
    () =>
      this.options().find((option) => option.value === this.value())?.label ??
      "",
  );

  writeValue(value: unknown): void {
    this.value.set(value);
  }

  protected toggle = (): void => {
    this.open.update((value) => !value);
    if (this.open()) {
      const index = this.options().findIndex(
        (option) => option.value === this.value(),
      );
      this.activeIndex.set(Math.max(0, index));
    }
  };

  protected pick = (option: VikingSelectOption): void => {
    if (option.disabled) {
      return;
    }
    this.value.set(option.value);
    this.onChange(option.value);
    this.onTouched();
    this.open.set(false);
  };

  protected onKeydown = (event: KeyboardEvent): void => {
    const options = this.options();
    if (!this.open()) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        this.toggle();
      }
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        this.activeIndex.update((index) =>
          Math.min(options.length - 1, index + 1),
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        this.activeIndex.update((index) => Math.max(0, index - 1));
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        this.pick(options[this.activeIndex()]);
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
