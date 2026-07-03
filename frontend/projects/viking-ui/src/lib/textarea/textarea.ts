import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { VikingControl, provideVikingCva } from '../core/cva';

/**
 * viking-textarea — auto-growing textarea.
 * ControlValueAccessor-compatible.
 */
@Component({
  selector: 'viking-textarea',
  providers: [provideVikingCva(VikingTextarea)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="viking-control viking-textarea-shell" [class.viking-disabled]="isDisabled()">
      <textarea
        [rows]="rows()"
        [placeholder]="placeholder()"
        [value]="value()"
        [disabled]="isDisabled()"
        [attr.aria-label]="label() || placeholder() || 'Text area'"
        [style.resize]="autoGrow() ? 'none' : 'vertical'"
        (input)="onInput($event)"
        (blur)="onTouched()"
      ></textarea>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .viking-textarea-shell {
        display: flex;
        width: 100%;
        padding: var(--viking-space-1-5) var(--viking-space-2);
        background: var(--viking-surface);
        border: 1px solid var(--viking-border-strong);
        border-radius: var(--viking-radius);
        box-shadow: var(--viking-shadow-sm);
        transition: var(--viking-transition-interactive);
      }
      .viking-textarea-shell:hover:not(.viking-disabled) {
        border-color: var(--viking-accent-strong);
        box-shadow: var(--viking-shadow-md);
      }
      .viking-textarea-shell:focus-within {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
        border-color: var(--viking-accent);
      }
      .viking-disabled {
        opacity: var(--viking-state-disabled-opacity);
        cursor: not-allowed;
      }
      textarea {
        width: 100%;
        box-sizing: border-box;
        border: none;
        outline: none !important;
        background: transparent;
        color: var(--viking-text);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size);
        line-height: 1.55;
        padding: 0;
      }
      textarea::placeholder {
        color: var(--viking-text-muted);
      }
    `,
  ],
})
export class VikingTextarea extends VikingControl<string> {
  readonly value = model<string>('');
  readonly placeholder = input<string>('');
  readonly label = input<string>('');
  readonly rows = input<number>(3);
  readonly autoGrow = input<boolean>(true);
  readonly disabled = input<boolean>(false);

  protected isDisabled = (): boolean => this.disabled() || this.formDisabled();

  writeValue(value: string): void {
    this.value.set(value ?? '');
  }

  protected onInput = (event: Event): void => {
    const el = event.target as HTMLTextAreaElement;
    this.value.set(el.value);
    this.onChange(el.value);
    if (this.autoGrow()) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  };
}
