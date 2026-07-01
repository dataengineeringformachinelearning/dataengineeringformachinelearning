import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { FluxControl, provideFluxCva } from '../core/cva';

/**
 * flux-textarea — auto-growing textarea (https://fluxui.dev/components/textarea).
 * ControlValueAccessor-compatible.
 */
@Component({
  selector: 'flux-textarea',
  providers: [provideFluxCva(FluxTextarea)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <textarea
      class="flux-control"
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
        padding: var(--flux-space-1) var(--flux-space-2);
        background: var(--flux-surface);
        border: 1px solid var(--flux-border-strong);
        border-radius: var(--flux-radius);
        box-shadow: var(--flux-shadow-sm);
        color: var(--flux-text);
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
        line-height: 1.55;
        transition: border-color 0.2s ease;
      }
      textarea:hover:not(:disabled) {
        border-color: var(--flux-accent-strong);
      }
      textarea:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: var(--flux-ring-offset);
      }
      textarea:disabled {
        opacity: 0.55;
      }
      textarea::placeholder {
        color: var(--flux-text-muted);
      }
    `,
  ],
})
export class FluxTextarea extends FluxControl<string> {
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
