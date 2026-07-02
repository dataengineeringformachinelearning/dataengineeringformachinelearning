import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { FluxControl, provideFluxCva } from '../core/cva';
import { FluxIcon } from '../icon/icon';

/**
 * flux-checkbox — custom checkbox (https://fluxui.dev/components/checkbox).
 * ControlValueAccessor-compatible.
 */
@Component({
  selector: 'flux-checkbox',
  imports: [FluxIcon],
  providers: [provideFluxCva(FluxCheckbox)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="flux-checkbox" [class.flux-disabled]="disabled() || formDisabled()">
      <span class="flux-checkbox-box" [class.flux-checked]="checked() || indeterminate()">
        <input
          type="checkbox"
          [checked]="checked()"
          [indeterminate]="indeterminate()"
          [disabled]="disabled() || formDisabled()"
          (change)="toggle($event)"
          (blur)="onTouched()"
        />
        @if (indeterminate()) {
          <flux-icon name="minus" [size]="14" />
        } @else if (checked()) {
          <flux-icon name="check" [size]="14" />
        }
      </span>
      <span class="flux-checkbox-content">
        <span class="flux-checkbox-label"><ng-content /></span>
        @if (description()) {
          <span class="flux-checkbox-description">{{ description() }}</span>
        }
      </span>
    </label>
  `,
  styles: [
    `
      :host {
        display: block;
        font-family: var(--flux-font-family);
      }
      .flux-checkbox {
        display: inline-flex;
        align-items: flex-start;
        gap: var(--flux-space-1);
        cursor: pointer;
      }
      .flux-disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .flux-checkbox-box {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--flux-space-2);
        height: var(--flux-space-2);
        margin-top: 3px;
        border: 1px solid var(--flux-border-strong);
        border-radius: calc(var(--flux-radius) / 2);
        background: var(--flux-surface);
        color: var(--flux-accent-content);
        transition: var(--flux-transition);
        flex-shrink: 0;
      }
      /* The native input fills the visual box so clicks and focus land on it. */
      .flux-checkbox-box input {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        opacity: 0;
        cursor: pointer;
      }
      .flux-checkbox:hover:not(.flux-disabled) .flux-checkbox-box {
        border-color: var(--flux-accent-strong);
      }
      .flux-checkbox-box.flux-checked {
        background: var(--flux-accent);
        border-color: var(--flux-accent);
      }
      .flux-checkbox-box:has(input:focus-visible) {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: var(--flux-ring-offset);
      }
      .flux-checkbox-content {
        display: flex;
        flex-direction: column;
      }
      .flux-checkbox-label {
        font-size: var(--flux-font-size);
        color: var(--flux-text);
        line-height: 1.45;
      }
      .flux-checkbox-description {
        font-size: var(--flux-font-size);
        color: var(--flux-text-muted);
      }
    `,
  ],
})
export class FluxCheckbox extends FluxControl<boolean> {
  readonly checked = model<boolean>(false);
  readonly indeterminate = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly description = input<string>('');

  writeValue(value: boolean): void {
    this.checked.set(!!value);
  }

  protected toggle = (event: Event): void => {
    const next = (event.target as HTMLInputElement).checked;
    this.checked.set(next);
    this.onChange(next);
  };
}
