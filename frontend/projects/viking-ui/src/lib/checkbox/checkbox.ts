import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { VikingControl, provideVikingCva } from '../core/cva';
import { VikingIcon } from '../icon/icon';

/**
 * viking-checkbox — custom checkbox (https://fluxui.dev/components/checkbox).
 * ControlValueAccessor-compatible.
 */
@Component({
  selector: 'viking-checkbox',
  imports: [VikingIcon],
  providers: [provideVikingCva(VikingCheckbox)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="viking-checkbox" [class.viking-disabled]="disabled() || formDisabled()">
      <span class="viking-checkbox-box" [class.viking-checked]="checked() || indeterminate()">
        <input
          type="checkbox"
          [checked]="checked()"
          [indeterminate]="indeterminate()"
          [disabled]="disabled() || formDisabled()"
          (change)="toggle($event)"
          (blur)="onTouched()"
        />
        @if (indeterminate()) {
          <viking-icon name="minus" [size]="14" />
        } @else if (checked()) {
          <viking-icon name="check" [size]="14" />
        }
      </span>
      <span class="viking-checkbox-content">
        <span class="viking-checkbox-label"><ng-content /></span>
        @if (description()) {
          <span class="viking-checkbox-description">{{ description() }}</span>
        }
      </span>
    </label>
  `,
  styles: [
    `
      :host {
        display: block;
        font-family: var(--viking-font-family);
      }
      .viking-checkbox {
        display: inline-flex;
        align-items: flex-start;
        gap: var(--viking-space-1);
        cursor: pointer;
      }
      .viking-disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .viking-checkbox-box {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--viking-space-2);
        height: var(--viking-space-2);
        margin-top: 3px;
        border: 1px solid var(--viking-border-strong);
        border-radius: calc(var(--viking-radius) / 2);
        background: var(--viking-surface);
        color: var(--viking-accent-content);
        transition: var(--viking-transition);
        flex-shrink: 0;
      }
      /* The native input fills the visual box so clicks and focus land on it. */
      .viking-checkbox-box input {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        opacity: 0;
        cursor: pointer;
      }
      .viking-checkbox:hover:not(.viking-disabled) .viking-checkbox-box {
        border-color: var(--viking-accent-strong);
      }
      .viking-checkbox-box.viking-checked {
        background: var(--viking-accent);
        border-color: var(--viking-accent);
      }
      .viking-checkbox-box:has(input:focus-visible) {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-checkbox-content {
        display: flex;
        flex-direction: column;
      }
      .viking-checkbox-label {
        font-size: var(--viking-font-size);
        color: var(--viking-text);
        line-height: 1.45;
      }
      .viking-checkbox-description {
        font-size: var(--viking-font-size);
        color: var(--viking-text-muted);
      }
    `,
  ],
})
export class VikingCheckbox extends VikingControl<boolean> {
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
