import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  model,
  signal,
} from "@angular/core";
import { VikingControl, provideVikingCva } from "../core/cva";
import { VikingIcon } from "../icon/icon";

/**
 * viking-time-picker — dropdown time selection.
 * Value is a 24h HH:MM string. ControlValueAccessor-compatible.
 */
@Component({
  selector: "viking-time-picker",
  imports: [VikingIcon],
  providers: [provideVikingCva(VikingTimePicker)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "(document:click)": "onDocumentClick($event)",
    "(keydown.escape)": "open.set(false)",
  },
  template: `
    <button
      type="button"
      class="viking-control viking-time-trigger"
      [disabled]="disabled() || formDisabled()"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="label() || placeholder()"
      aria-haspopup="listbox"
      (click)="open.set(!open())"
    >
      <viking-icon name="clock" [size]="20" />
      <span
        class="viking-time-value"
        [class.viking-time-placeholder]="!value()"
      >
        {{ value() || placeholder() }}
      </span>
      <viking-icon
        [name]="open() ? 'chevron-up' : 'chevron-down'"
        [size]="18"
      />
    </button>
    @if (open()) {
      <div class="viking-time-panel" role="listbox" aria-label="Choose time">
        @for (slot of slots(); track slot) {
          <button
            type="button"
            role="option"
            class="viking-time-option"
            [class.viking-selected]="slot === value()"
            [attr.aria-selected]="slot === value()"
            (click)="pick(slot)"
          >
            {{ slot }}
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
      .viking-time-trigger {
        display: flex;
        align-items: center;
        gap: var(--viking-space-1);
        width: 100%;
        min-height: var(--viking-control-height);
        padding: 0 var(--viking-space-2);
        background: var(--viking-surface);
        border: 1px solid var(--viking-border-strong);
        border-radius: var(--viking-radius);
        box-shadow: var(--viking-shadow-sm);
        color: var(--viking-text-muted);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size);
        cursor: pointer;
        transition: var(--viking-transition);
        text-align: left;
      }
      .viking-time-trigger:hover:not(:disabled) {
        border-color: var(--viking-accent-strong);
      }
      .viking-time-trigger:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-time-trigger:disabled {
        opacity: var(--viking-state-disabled-opacity);
        cursor: not-allowed;
      }
      .viking-time-value {
        flex: 1;
        color: var(--viking-text);
        font-variant-numeric: tabular-nums;
      }
      .viking-time-placeholder {
        color: var(--viking-text-muted);
      }
      .viking-time-panel {
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
        max-height: 279px;
        overflow: auto;
      }
      .viking-time-option {
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
        font-variant-numeric: tabular-nums;
      }
      .viking-time-option:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: -2px;
      }
      .viking-time-option:hover {
        background: var(--viking-accent-soft);
      }
      .viking-selected {
        color: var(--viking-accent);
        font-weight: 600;
      }
    `,
  ],
})
export class VikingTimePicker extends VikingControl<string | null> {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly value = model<string | null>(null);
  readonly placeholder = input<string>("Select time");
  readonly label = input<string>("");
  readonly disabled = input<boolean>(false);
  /** Minute granularity for generated slots. */
  readonly stepMinutes = input<number>(30);

  constructor() {
    super();
  }

  protected readonly open = signal(false);

  protected readonly slots = computed<string[]>(() => {
    const step = Math.max(5, this.stepMinutes());
    const result: string[] = [];
    for (let minutes = 0; minutes < 24 * 60; minutes += step) {
      const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
      const mins = String(minutes % 60).padStart(2, "0");
      result.push(`${hours}:${mins}`);
    }
    return result;
  });

  writeValue(value: string | null): void {
    this.value.set(value);
  }

  protected pick = (slot: string): void => {
    this.value.set(slot);
    this.onChange(slot);
    this.onTouched();
    this.open.set(false);
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
