import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  output,
} from "@angular/core";
import { VikingControl, provideVikingCva } from "../core/cva";

/**
 * viking-otp-input — one-time-passcode input.
 * Uses one native field so SMS codes and password managers can autofill the
 * entire value atomically. ControlValueAccessor-compatible.
 */
@Component({
  selector: "viking-otp-input",
  providers: [provideVikingCva(VikingOtpInput)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[class.viking-otp-centered]": "centered()",
  },
  template: `
    <div class="viking-otp">
      <input
        class="viking-otp-input"
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        autocomplete="one-time-code"
        [attr.maxlength]="length()"
        [attr.name]="name() || 'one-time-code'"
        [attr.id]="inputId() || null"
        [value]="value()"
        [disabled]="disabled() || formDisabled()"
        [attr.aria-label]="label() || 'One-time passcode'"
        (input)="onInput($event)"
        (blur)="onTouched()"
      />
    </div>
  `,
  styles: [
    `
      .viking-otp {
        display: flex;
        width: 100%;
      }
      :host(.viking-otp-centered) .viking-otp {
        justify-content: center;
      }
      .viking-otp-input {
        width: 100%;
        min-width: 0;
        min-height: var(--viking-control-height);
        padding: 0 var(--viking-control-padding-x);
        box-sizing: border-box;
        text-align: center;
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-lg);
        font-weight: var(--viking-font-weight-semibold);
        letter-spacing: var(--viking-letter-spacing-caps);
        color: var(--viking-text);
        background: var(
          --viking-surface-recipe-muted,
          var(--viking-surface-alt)
        );
        border: 1px solid var(--viking-border-strong);
        border-radius: var(--viking-radius-md);
        box-shadow: var(--viking-shadow-xs);
        transition: var(--viking-transition-interactive);
        font-variant-numeric: tabular-nums;
      }
      .viking-otp-input:hover:not(:disabled) {
        border-color: color-mix(
          in srgb,
          var(--viking-accent) 35%,
          var(--viking-border-strong)
        );
        box-shadow: var(--viking-shadow-sm);
      }
      .viking-otp-input:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
        border-color: var(--viking-accent);
      }
      .viking-otp-input:disabled {
        opacity: var(--viking-state-disabled-opacity);
      }
    `,
  ],
})
export class VikingOtpInput extends VikingControl<string> {
  readonly length = input<number>(6);
  readonly value = model<string>("");
  readonly label = input<string>("");
  /** HTML name on the first cell for SMS / password-manager OTP autofill. */
  readonly name = input<string>("one-time-code");
  /** Optional id on the first cell for label[for] association. */
  readonly inputId = input<string>("");
  readonly disabled = input<boolean>(false);
  readonly centered = input<boolean>(false);

  readonly completed = output<string>();

  writeValue(value: string): void {
    this.value.set(value ?? "");
  }

  private commit(next: string): void {
    this.value.set(next);
    this.onChange(next);
    if (next.length === this.length()) {
      this.completed.emit(next);
    }
  }

  protected onInput = (event: Event): void => {
    const inputElement = event.target as HTMLInputElement;
    const digits = inputElement.value
      .replace(/\D/g, "")
      .slice(0, this.length());
    if (inputElement.value !== digits) {
      inputElement.value = digits;
    }
    this.commit(digits);
  };
}
