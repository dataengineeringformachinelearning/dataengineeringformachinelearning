import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { VikingControl, provideVikingCva } from '../core/cva';
import { VikingIcon } from '../icon/icon';

/**
 * viking-color-picker — swatch presets + custom color input
 *. ControlValueAccessor-compatible.
 * Default presets are the THEME.md palette.
 */
@Component({
  selector: 'viking-color-picker',
  imports: [VikingIcon],
  providers: [provideVikingCva(VikingColorPicker)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="viking-color-picker" role="group" [attr.aria-label]="label() || 'Color picker'">
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
        border-radius: var(--viking-radius);
        cursor: pointer;
        color: var(--viking-accent-content);
        transition: var(--viking-transition-interactive);
        padding: 0;
        box-shadow: var(--viking-shadow-xs);
      }
      .viking-color-swatch:hover,
      .viking-color-custom:hover {
        transform: scale(1.06);
        border-color: var(--viking-accent-strong);
        box-shadow: var(--viking-shadow-sm);
      }
      .viking-color-swatch:focus-visible,
      .viking-color-custom:focus-within {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-selected {
        border-color: var(--viking-text);
        box-shadow:
          var(--viking-shadow-sm),
          inset 0 1px 0 rgba(255, 255, 255, 0.12);
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
        font-size: var(--viking-font-size);
        color: var(--viking-text-muted);
        background: transparent;
        padding: 0;
        font-variant-numeric: tabular-nums;
      }
    `,
  ],
})
export class VikingColorPicker extends VikingControl<string> {
  readonly value = model<string>('#0d7377');
  readonly label = input<string>('');
  readonly disabled = input<boolean>(false);
  /** Preset swatches — THEME.md Series color palette (premium charcoal / teal / crimson). */
  readonly presets = input<string[]>([
    '#0d7377',
    '#922b3e',
    '#2a9d8f',
    '#c4a035',
    '#a83344',
    '#3d8bfd',
    '#2a2a2a',
    '#666666',
  ]);

  writeValue(value: string): void {
    this.value.set(value || '#0d7377');
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
