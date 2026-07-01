import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { FluxControl, provideFluxCva } from '../core/cva';

/**
 * flux-switch — toggle switch (https://fluxui.dev/components/switch).
 * ControlValueAccessor-compatible.
 */
@Component({
  selector: 'flux-switch',
  providers: [provideFluxCva(FluxSwitch)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="flux-switch" [class.flux-disabled]="disabled() || formDisabled()">
      <input
        type="checkbox"
        role="switch"
        [checked]="checked()"
        [disabled]="disabled() || formDisabled()"
        (change)="toggle($event)"
        (blur)="onTouched()"
      />
      <span class="flux-switch-track" aria-hidden="true">
        <span class="flux-switch-thumb"></span>
      </span>
      <span class="flux-switch-content">
        <span class="flux-switch-label"><ng-content /></span>
        @if (description()) {
          <span class="flux-switch-description">{{ description() }}</span>
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
      .flux-switch {
        display: inline-flex;
        align-items: flex-start;
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
      .flux-switch-track {
        display: inline-flex;
        align-items: center;
        width: var(--flux-space-4);
        height: calc(var(--flux-space-2) + 2px);
        padding: 2px;
        margin-top: 3px;
        border-radius: var(--flux-radius-pill);
        background: var(--flux-surface-alt);
        border: 1px solid var(--flux-border-strong);
        transition: var(--flux-transition);
        flex-shrink: 0;
        box-sizing: border-box;
      }
      .flux-switch-thumb {
        width: 14px;
        height: 14px;
        border-radius: var(--flux-radius-pill);
        background: var(--flux-text-muted);
        transition: var(--flux-transition);
      }
      input:checked + .flux-switch-track {
        background: var(--flux-accent);
        border-color: var(--flux-accent);
      }
      input:checked + .flux-switch-track .flux-switch-thumb {
        background: var(--flux-accent-content);
        transform: translateX(calc(var(--flux-space-4) - 22px));
      }
      input:focus-visible + .flux-switch-track {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: var(--flux-ring-offset);
      }
      .flux-switch-content {
        display: flex;
        flex-direction: column;
      }
      .flux-switch-label {
        font-size: var(--flux-font-size);
        color: var(--flux-text);
        line-height: 1.45;
      }
      .flux-switch-description {
        font-size: var(--flux-font-size);
        color: var(--flux-text-muted);
      }
    `,
  ],
})
export class FluxSwitch extends FluxControl<boolean> {
  readonly checked = model<boolean>(false);
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
