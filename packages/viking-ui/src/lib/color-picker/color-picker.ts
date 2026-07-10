import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
} from "@angular/core";
import { VikingControl, provideVikingCva } from "../core/cva";
import { VikingIcon } from "../icon/icon";
import {
  VIKING_SERIES_DEFAULT,
  VIKING_SERIES_PRESETS,
} from "../../tokens/series-presets";

/**
 * viking-color-picker — swatch presets + custom color input
 *. ControlValueAccessor-compatible.
 * Default presets are the THEME.md palette.
 */
@Component({
  selector: "viking-color-picker",
  imports: [VikingIcon],
  providers: [provideVikingCva(VikingColorPicker)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="viking-color-picker"
      role="group"
      [attr.aria-label]="label() || 'Color picker'"
    >
      @for (preset of presets(); track preset) {
        <button
          type="button"
          class="viking-color-swatch"
          [class.viking-selected]="preset === value()"
          [style.background]="preset"
          [attr.aria-label]="'Color ' + preset"
          [attr.aria-pressed]="preset === value()"
          (click)="pick(preset)"
        >
          @if (preset === value()) {
            <viking-icon name="check" [size]="16" />
          }
        </button>
      }
      <label class="viking-color-custom" [style.background]="value()">
        <input
          type="color"
          [value]="value()"
          [disabled]="disabled() || formDisabled()"
          aria-label="Custom color"
          (input)="onInput($event)"
        />
        <viking-icon name="pencil" [size]="16" />
      </label>
      <code class="viking-color-value">{{ value() }}</code>
    </div>
  `,
  styles: [
    `
      .viking-color-picker {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--viking-space-1);
        font-family: var(--viking-font-family);
      }
      .viking-color-swatch,
      .viking-color-custom {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--viking-space-4);
        height: var(--viking-space-4);
        border: 1px solid var(--viking-border-strong);
        border-radius: var(--viking-radius-sm);
        cursor: pointer;
        color: var(--viking-accent-content);
        transition: var(--viking-transition-interactive);
        padding: 0;
        box-shadow: var(--viking-shadow-xs);
      }
      .viking-color-swatch:hover,
      .viking-color-custom:hover {
        transform: scale(1.08);
        border-color: var(--viking-accent-strong);
        box-shadow: var(--viking-shadow-sm);
        z-index: 1;
      }
      .viking-selected {
        border-color: var(--viking-text);
        box-shadow:
          var(--viking-shadow-sm),
          0 0 0 2px color-mix(in srgb, var(--viking-accent) 35%, transparent),
          inset 0 1px 0 rgba(255, 255, 255, 0.12);
        transform: scale(1.04);
      }
      .viking-color-swatch:focus-visible,
      .viking-color-custom:focus-within {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      /* The native input fills the swatch so clicks and focus land on it. */
      .viking-color-custom input {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        opacity: 0;
        cursor: pointer;
      }
      .viking-color-value {
        font-family: var(--viking-font-family-mono);
        font-size: var(--viking-font-size-sm);
        color: var(--viking-text-muted);
        background: var(--viking-surface-alt);
        border: 1px solid var(--viking-border-subtle);
        border-radius: var(--viking-radius-xs);
        padding: var(--viking-space-0-5) var(--viking-space-1);
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }
    `,
  ],
})
export class VikingColorPicker extends VikingControl<string> {
  readonly value = model<string>(VIKING_SERIES_DEFAULT);
  readonly label = input<string>("");
  readonly disabled = input<boolean>(false);
  /** Preset swatches — THEME.md Series color palette (premium charcoal / teal / crimson). */
  readonly presets = input<string[]>([...VIKING_SERIES_PRESETS]);

  writeValue(value: string): void {
    this.value.set(value || VIKING_SERIES_DEFAULT);
  }

  protected pick = (color: string): void => {
    this.value.set(color);
    this.onChange(color);
    this.onTouched();
  };

  protected onInput = (event: Event): void => {
    this.pick((event.target as HTMLInputElement).value);
  };
}
