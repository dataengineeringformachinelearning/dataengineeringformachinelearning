import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { FluxControl, provideFluxCva } from '../core/cva';
import { FluxSelectOption } from '../core/types';
import { fluxUid } from '../core/uid';

/**
 * flux-radio-group — radio group (https://fluxui.dev/components/radio).
 * ControlValueAccessor-compatible; options-driven for symmetry with flux-select.
 */
@Component({
  selector: 'flux-radio-group',
  providers: [provideFluxCva(FluxRadioGroup)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'radiogroup',
    '[attr.aria-label]': 'label() || null',
    '[class.flux-radio-row]': "orientation() === 'horizontal'",
  },
  template: `
    @for (option of options(); track option.label) {
      <label
        class="flux-radio"
        [class.flux-disabled]="option.disabled || disabled() || formDisabled()"
      >
        <input
          type="radio"
          [name]="groupName"
          [checked]="option.value === value()"
          [disabled]="option.disabled || disabled() || formDisabled()"
          (change)="select(option)"
          (blur)="onTouched()"
        />
        <span class="flux-radio-dot" aria-hidden="true"></span>
        <span class="flux-radio-label">{{ option.label }}</span>
      </label>
    }
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--flux-space-1);
        font-family: var(--flux-font-family);
      }
      :host(.flux-radio-row) {
        flex-direction: row;
        flex-wrap: wrap;
        gap: var(--flux-space-2);
      }
      .flux-radio {
        display: inline-flex;
        align-items: center;
        gap: var(--flux-space-1);
        cursor: pointer;
      }
      .flux-disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      input {
        position: absolute;
        opacity: 0;
        width: 1px;
        height: 1px;
      }
      .flux-radio-dot {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--flux-space-2);
        height: var(--flux-space-2);
        border-radius: var(--flux-radius-pill);
        border: 1px solid var(--flux-border-strong);
        background: var(--flux-surface);
        transition: var(--flux-transition);
        flex-shrink: 0;
      }
      .flux-radio:hover:not(.flux-disabled) .flux-radio-dot {
        border-color: var(--flux-accent-strong);
      }
      input:checked + .flux-radio-dot {
        border-color: var(--flux-accent);
        border-width: 5px;
        background: var(--flux-accent-content);
      }
      input:focus-visible + .flux-radio-dot {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: var(--flux-ring-offset);
      }
      .flux-radio-label {
        font-size: var(--flux-font-size);
        color: var(--flux-text);
      }
    `,
  ],
})
export class FluxRadioGroup extends FluxControl<unknown> {
  readonly options = input.required<FluxSelectOption[]>();
  readonly value = model<unknown>(null);
  readonly label = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly orientation = input<'vertical' | 'horizontal'>('vertical');

  protected readonly groupName = fluxUid('flux-radio');

  writeValue(value: unknown): void {
    this.value.set(value);
  }

  protected select = (option: FluxSelectOption): void => {
    this.value.set(option.value);
    this.onChange(option.value);
  };
}
