import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
} from "@angular/core";
import { fieldDescribedBy } from "../../core/field-a11y";
import { vikingUid } from "../../core/uid";
import { VikingControl, provideVikingCva } from "../core/cva";
import { VikingOtpInput } from "../otp-input/otp-input";

/**
 * viking-verification-code-field — labeled, centered OTP entry for MFA and phone verification flows.
 */
@Component({
  selector: "viking-verification-code-field",
  imports: [VikingOtpInput],
  providers: [provideVikingCva(VikingVerificationCodeField)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: "viking-verification-code-field",
    "[class.viking-verification-code-field-invalid]": "!!error()",
  },
  template: `
    <fieldset class="viking-verification-code-fieldset">
      @if (label()) {
        <legend class="viking-verification-code-label" [id]="labelId">
          {{ label() }}
          @if (required()) {
            <span class="viking-verification-code-required" aria-hidden="true"
              >*</span
            >
          }
        </legend>
      }
      <div class="viking-verification-code-control">
        <viking-otp-input
          [length]="length()"
          [value]="value()"
          (valueChange)="onValueChange($event)"
          [disabled]="disabled() || formDisabled()"
          [label]="label()"
          [name]="name()"
          [inputId]="inputId"
          [describedBy]="otpDescribedBy() || ''"
          [invalid]="!!error()"
          [required]="required()"
          [centered]="true"
          (completed)="completed.emit($event)"
        />
      </div>
    </fieldset>
    @if (description()) {
      <p class="viking-verification-code-description" [id]="descriptionId">
        {{ description() }}
      </p>
    }
    @if (error()) {
      <p
        class="viking-verification-code-error"
        [id]="errorId"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <span class="suite-sr-only viking-sr-only">Error: </span>{{ error() }}
      </p>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        font-family: var(--viking-font-family);
      }

      :host(.viking-verification-code-field-invalid) {
        animation: viking-shake var(--viking-duration-slow)
          var(--viking-ease-default);
      }

      .viking-verification-code-fieldset {
        margin: 0;
        padding: 0;
        border: 0;
        min-width: 0;
        width: 100%;
      }

      .viking-verification-code-label {
        display: block;
        width: 100%;
        margin-bottom: var(--viking-space-1);
        padding: 0;
        font-size: var(--viking-font-size-sm);
        font-weight: var(--viking-font-weight-semibold);
        color: var(--viking-text);
        letter-spacing: var(--viking-letter-spacing-wide);
        line-height: var(--viking-line-height-tight);
        text-align: center;
      }

      .viking-verification-code-required {
        color: var(--viking-danger);
        margin-left: var(--viking-space-0-5);
      }

      .viking-verification-code-control {
        display: flex;
        justify-content: center;
        width: 100%;
      }

      .viking-verification-code-description,
      .viking-verification-code-error {
        margin: var(--viking-space-1) 0 0;
        font-size: var(--viking-font-size-sm);
        line-height: var(--viking-line-height-normal);
        text-align: center;
      }

      .viking-verification-code-description {
        color: var(--viking-text-muted);
      }

      .viking-verification-code-error {
        color: var(--viking-danger-text, var(--viking-danger));
        font-weight: var(--viking-font-weight-semibold);
      }

      @media (prefers-reduced-motion: reduce) {
        :host(.viking-verification-code-field-invalid) {
          animation: none;
        }
      }
    `,
  ],
})
export class VikingVerificationCodeField extends VikingControl<string> {
  readonly length = input<number>(6);
  readonly label = input<string>("Verification Code");
  readonly description = input<string>("");
  readonly error = input<string>("");
  readonly required = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  /** Native name for SMS OTP autofill (password managers / OS text message codes). */
  readonly name = input<string>("one-time-code");

  readonly completed = output<string>();

  readonly value = model<string>("");
  protected readonly labelId = vikingUid("viking-verification-code-label");
  protected readonly inputId = vikingUid("viking-verification-code-input");
  protected readonly descriptionId = vikingUid(
    "viking-verification-code-description",
  );
  protected readonly errorId = vikingUid("viking-verification-code-error");
  protected readonly otpDescribedBy = computed(() =>
    fieldDescribedBy({
      descriptionId: this.descriptionId,
      errorId: this.errorId,
      hasDescription: !!this.description(),
      hasError: !!this.error(),
    }),
  );

  writeValue(value: string): void {
    this.value.set(value ?? "");
  }

  protected onValueChange = (next: string): void => {
    this.value.set(next);
    this.onChange(next);
    this.onTouched();
  };
}
