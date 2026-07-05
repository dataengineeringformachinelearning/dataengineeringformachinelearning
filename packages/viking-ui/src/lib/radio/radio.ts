import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
} from "@angular/core";
import { VikingControl, provideVikingCva } from "../core/cva";
import { VikingSelectOption } from "../../core/types";
import { vikingUid } from "../../core/uid";

/**
 * viking-radio-group — radio group.
 * ControlValueAccessor-compatible; options-driven for symmetry with viking-select.
 */
@Component({
  selector: "viking-radio-group",
  providers: [provideVikingCva(VikingRadioGroup)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: "radiogroup",
    "[attr.aria-label]": "label() || null",
    "[class.viking-radio-row]": "orientation() === 'horizontal'",
  },
  template: `
    @for (option of options(); track option.label) {
      <label
        class="viking-radio"
        [class.viking-disabled]="
          option.disabled || disabled() || formDisabled()
        "
      >
        <span
          class="viking-radio-dot"
          [class.viking-checked]="option.value === value()"
        >
          <input
            type="radio"
            [name]="groupName"
            [checked]="option.value === value()"
            [disabled]="option.disabled || disabled() || formDisabled()"
            (change)="select(option)"
            (blur)="onTouched()"
          />
        </span>
        <span class="viking-radio-label">{{ option.label }}</span>
      </label>
    }
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-1);
        font-family: var(--viking-font-family);
      }
      :host(.viking-radio-row) {
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--viking-space-2);
      }
      .viking-radio {
        display: inline-flex;
        align-items: center;
        gap: var(--viking-space-1);
        cursor: pointer;
      }
      .viking-disabled {
        opacity: var(--viking-state-disabled-opacity);
        cursor: not-allowed;
      }
      .viking-radio-dot {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--viking-space-2);
        height: var(--viking-space-2);
        border-radius: var(--viking-radius-pill);
        border: 1px solid var(--viking-border-strong);
        background: var(--viking-surface);
        transition: var(--viking-transition);
        flex-shrink: 0;
        box-sizing: border-box;
      }
      /* The native input fills the visual dot so clicks and focus land on it. */
      .viking-radio-dot input {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        opacity: 0;
        cursor: pointer;
      }
      .viking-radio:hover:not(.viking-disabled) .viking-radio-dot {
        border-color: var(--viking-accent-strong);
      }
      .viking-radio-dot.viking-checked {
        border-color: var(--viking-accent);
        border-width: 5px;
        background: var(--viking-accent-content);
      }
      .viking-radio-dot:has(input:focus-visible) {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-radio-label {
        font-size: var(--viking-font-size);
        color: var(--viking-text);
      }
    `,
  ],
})
export class VikingRadioGroup extends VikingControl<unknown> {
  readonly options = input.required<VikingSelectOption[]>();
  readonly value = model<unknown>(null);
  readonly label = input<string>("");
  readonly disabled = input<boolean>(false);
  readonly orientation = input<"vertical" | "horizontal">("vertical");

  protected readonly groupName = vikingUid("viking-radio");

  writeValue(value: unknown): void {
    this.value.set(value);
  }

  protected select = (option: VikingSelectOption): void => {
    this.value.set(option.value);
    this.onChange(option.value);
  };
}
