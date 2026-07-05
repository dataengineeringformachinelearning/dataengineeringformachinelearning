import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
} from "@angular/core";
import { VikingControl, provideVikingCva } from "../core/cva";

/**
 * viking-switch — toggle switch.
 * ControlValueAccessor-compatible.
 */
@Component({
  selector: "viking-switch",
  providers: [provideVikingCva(VikingSwitch)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label
      class="viking-switch"
      [class.viking-disabled]="disabled() || formDisabled()"
    >
      <span class="viking-switch-track" [class.viking-checked]="checked()">
        <input
          type="checkbox"
          role="switch"
          [checked]="checked()"
          [disabled]="disabled() || formDisabled()"
          (change)="toggle($event)"
          (blur)="onTouched()"
        />
        <span class="viking-switch-thumb"></span>
      </span>
      <span class="viking-switch-content">
        <span class="viking-switch-label"><ng-content /></span>
        @if (description()) {
          <span class="viking-switch-description">{{ description() }}</span>
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
      .viking-switch {
        display: inline-flex;
        align-items: flex-start;
        gap: var(--viking-space-1);
        cursor: pointer;
      }
      .viking-disabled {
        opacity: var(--viking-state-disabled-opacity);
        cursor: not-allowed;
      }
      .viking-switch-track {
        position: relative;
        display: inline-flex;
        align-items: center;
        width: var(--viking-space-4);
        height: calc(var(--viking-space-2) + 2px);
        padding: 2px;
        margin-top: 3px;
        border-radius: var(--viking-radius-pill);
        background: var(--viking-surface-alt);
        border: 1px solid var(--viking-border-strong);
        transition: var(--viking-transition-interactive);
        flex-shrink: 0;
        box-sizing: border-box;
      }
      /* The native input fills the visual track so clicks and focus land on it. */
      .viking-switch-track input {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        opacity: 0;
        cursor: pointer;
      }
      .viking-switch-thumb {
        width: 14px;
        height: 14px;
        border-radius: var(--viking-radius-pill);
        background: var(--viking-text-muted);
        transition: var(--viking-transition-transform);
      }
      .viking-switch-track.viking-checked {
        background: var(--viking-accent);
        border-color: var(--viking-accent);
      }
      .viking-switch-track.viking-checked .viking-switch-thumb {
        background: var(--viking-accent-content);
        transform: translateX(calc(var(--viking-space-4) - 22px));
      }
      .viking-switch-track:has(input:focus-visible) {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-switch-content {
        display: flex;
        flex-direction: column;
      }
      .viking-switch-label {
        font-size: var(--viking-font-size);
        color: var(--viking-text);
        line-height: 1.45;
      }
      .viking-switch-description {
        font-size: var(--viking-font-size);
        color: var(--viking-text-muted);
      }
    `,
  ],
})
export class VikingSwitch extends VikingControl<boolean> {
  readonly checked = model<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly description = input<string>("");

  writeValue(value: boolean): void {
    this.checked.set(!!value);
  }

  protected toggle = (event: Event): void => {
    const next = (event.target as HTMLInputElement).checked;
    this.checked.set(next);
    this.onChange(next);
  };
}
