import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { VikingControl, provideVikingCva } from '../core/cva';

/**
 * viking-otp-input — one-time-passcode input (https://fluxui.dev/components/otp-input).
 * Auto-advances between cells and supports paste. ControlValueAccessor-compatible.
 */
@Component({
  selector: 'viking-otp-input',
  providers: [provideVikingCva(VikingOtpInput)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="viking-otp" role="group" [attr.aria-label]="label() || 'One-time passcode'">
      @for (index of indexes(); track index) {
        <input
          class="viking-otp-cell"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="1"
          [value]="value().charAt(index) || ''"
          [disabled]="disabled() || formDisabled()"
          [attr.aria-label]="'Digit ' + (index + 1)"
          (input)="onCellInput($event, index)"
          (keydown)="onKeydown($event, index)"
          (paste)="onPaste($event)"
          (blur)="onTouched()"
        />
      }
    </div>
  `,
  styles: [
    `
      .viking-otp {
        display: flex;
        gap: var(--viking-space-1);
      }
      .viking-otp-cell {
        width: var(--viking-control-height);
        height: var(--viking-control-height);
        text-align: center;
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-lg);
        font-weight: 600;
        color: var(--viking-text);
        background: var(--viking-surface);
        border: 1px solid var(--viking-border-strong);
        border-radius: var(--viking-radius);
        box-shadow: var(--viking-shadow-sm);
        transition: var(--viking-transition);
        font-variant-numeric: tabular-nums;
      }
      .viking-otp-cell:hover:not(:disabled) {
        border-color: var(--viking-accent-strong);
      }
      .viking-otp-cell:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
        border-color: var(--viking-accent);
      }
      .viking-otp-cell:disabled {
        opacity: 0.55;
      }
    `,
  ],
})
export class VikingOtpInput extends VikingControl<string> {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly length = input<number>(6);
  readonly value = model<string>('');
  readonly label = input<string>('');
  readonly disabled = input<boolean>(false);

  readonly completed = output<string>();

  protected readonly indexes = computed(() =>
    Array.from({ length: this.length() }, (_, index) => index),
  );

  writeValue(value: string): void {
    this.value.set(value ?? '');
  }

  private commit(next: string): void {
    this.value.set(next);
    this.onChange(next);
    if (next.length === this.length()) {
      this.completed.emit(next);
    }
  }

  private focusCell(index: number): void {
    const cells = this.host.nativeElement.querySelectorAll<HTMLInputElement>('.viking-otp-cell');
    cells[Math.min(this.length() - 1, Math.max(0, index))]?.focus();
  }

  protected onCellInput = (event: Event, index: number): void => {
    const char = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(-1);
    const chars = this.value().padEnd(this.length(), ' ').split('');
    chars[index] = char || ' ';
    this.commit(chars.join('').trimEnd().replace(/ /g, ''));
    if (char) {
      this.focusCell(index + 1);
    }
  };

  protected onKeydown = (event: KeyboardEvent, index: number): void => {
    if (event.key === 'Backspace' && !(event.target as HTMLInputElement).value) {
      this.focusCell(index - 1);
    } else if (event.key === 'ArrowLeft') {
      this.focusCell(index - 1);
    } else if (event.key === 'ArrowRight') {
      this.focusCell(index + 1);
    }
  };

  protected onPaste = (event: ClipboardEvent): void => {
    event.preventDefault();
    const digits = (event.clipboardData?.getData('text') ?? '')
      .replace(/\D/g, '')
      .slice(0, this.length());
    if (digits) {
      this.commit(digits);
      this.focusCell(digits.length - 1);
    }
  };
}
