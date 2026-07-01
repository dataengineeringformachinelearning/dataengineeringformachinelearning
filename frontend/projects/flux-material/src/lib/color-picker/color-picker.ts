import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { FluxControl, provideFluxCva } from '../core/cva';
import { FluxIcon } from '../icon/icon';

/**
 * flux-color-picker — swatch presets + custom color input
 * (https://fluxui.dev/components/color-picker). ControlValueAccessor-compatible.
 * Default presets are the THEME.md palette.
 */
@Component({
  selector: 'flux-color-picker',
  imports: [FluxIcon],
  providers: [provideFluxCva(FluxColorPicker)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flux-color-picker" role="group" [attr.aria-label]="label() || 'Color picker'">
      @for (preset of presets(); track preset) {
        <button
          type="button"
          class="flux-color-swatch"
          [class.flux-selected]="preset === value()"
          [style.background]="preset"
          [attr.aria-label]="'Color ' + preset"
          [attr.aria-pressed]="preset === value()"
          (click)="pick(preset)"
        >
          @if (preset === value()) {
            <flux-icon name="check" [size]="16" />
          }
        </button>
      }
      <label class="flux-color-custom" [style.background]="value()">
        <input
          type="color"
          [value]="value()"
          [disabled]="disabled() || formDisabled()"
          aria-label="Custom color"
          (input)="onInput($event)"
        />
        <flux-icon name="pencil" [size]="16" />
      </label>
      <code class="flux-color-value">{{ value() }}</code>
    </div>
  `,
  styles: [
    `
      .flux-color-picker {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--flux-space-1);
        font-family: var(--flux-font-family);
      }
      .flux-color-swatch,
      .flux-color-custom {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--flux-space-4);
        height: var(--flux-space-4);
        border: 1px solid var(--flux-border-strong);
        border-radius: var(--flux-radius);
        cursor: pointer;
        color: var(--white, #ffffff);
        transition: var(--flux-transition);
        padding: 0;
      }
      .flux-color-swatch:hover,
      .flux-color-custom:hover {
        transform: scale(1.08);
      }
      .flux-color-swatch:focus-visible,
      .flux-color-custom:focus-within {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: var(--flux-ring-offset);
      }
      .flux-selected {
        border-color: var(--flux-text);
        box-shadow: var(--flux-shadow-sm);
      }
      .flux-color-custom input {
        position: absolute;
        opacity: 0;
        width: 1px;
        height: 1px;
      }
      .flux-color-value {
        font-size: var(--flux-font-size);
        color: var(--flux-text-muted);
        font-variant-numeric: tabular-nums;
      }
    `,
  ],
})
export class FluxColorPicker extends FluxControl<string> {
  readonly value = model<string>('#2176ff');
  readonly label = input<string>('');
  readonly disabled = input<boolean>(false);
  /** Preset swatches — defaults to the THEME.md palette. */
  readonly presets = input<string[]>(['#31393c', '#2176ff', '#33a1fd', '#fdca40', '#f79824']);

  writeValue(value: string): void {
    this.value.set(value || '#2176ff');
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
