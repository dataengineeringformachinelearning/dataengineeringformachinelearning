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
    <textarea
      class="viking-control"
      [rows]="rows()"
      [placeholder]="placeholder()"
      [value]="value()"
      [disabled]="disabled() || formDisabled()"
      [attr.aria-label]="label() || placeholder() || 'Text area'"
      [style.resize]="autoGrow() ? 'none' : 'vertical'"
      (input)="onInput($event)"
      (blur)="onTouched()"
    ></textarea>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      textarea {
        width: 100%;
        box-sizing: border-box;
        padding: var(--viking-space-1) var(--viking-space-2);
        background: var(--viking-surface);
        border: 1px solid var(--viking-border-strong);
        border-radius: var(--viking-radius);
        box-shadow: var(--viking-shadow-sm);
        color: var(--viking-text);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size);
        line-height: 1.55;
        transition: border-color 0.2s ease;
      }
      textarea:hover:not(:disabled) {
        border-color: var(--viking-accent-strong);
      }
      textarea:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      textarea:disabled {
        opacity: 0.55;
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
