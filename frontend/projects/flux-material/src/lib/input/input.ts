import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { FluxControl, provideFluxCva } from '../core/cva';
import { FluxIcon } from '../icon/icon';
import { FluxIconName } from '../core/icons';

/**
 * flux-input — text input with icons, kbd hint and clearable state
 * (https://fluxui.dev/components/input). ControlValueAccessor-compatible.
 */
@Component({
  selector: 'flux-input',
  imports: [FluxIcon],
  providers: [provideFluxCva(FluxInput)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flux-control flux-input-shell" [class.flux-disabled]="isDisabled()">
      @if (icon()) {
        <flux-icon class="flux-input-icon" [name]="icon()!" [size]="20" />
      }
      <input
        [type]="type()"
        [placeholder]="placeholder()"
        [value]="value()"
        [disabled]="isDisabled()"
        [attr.aria-label]="label() || placeholder() || 'Text input'"
        [attr.autocomplete]="autocomplete() || null"
        (input)="onInput($event)"
        (blur)="onTouched()"
      />
      @if (clearable() && value()) {
        <button type="button" class="flux-input-clear" aria-label="Clear input" (click)="clear()">
          <flux-icon name="x" [size]="16" />
        </button>
      }
      @if (kbd()) {
        <kbd class="flux-input-kbd">{{ kbd() }}</kbd>
      }
      @if (iconTrailing()) {
        <flux-icon class="flux-input-icon" [name]="iconTrailing()!" [size]="20" />
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .flux-input-shell {
        display: flex;
        align-items: center;
        gap: var(--flux-space-1);
        min-height: var(--flux-control-height);
        padding: 0 var(--flux-space-2);
        background: var(--flux-surface);
        border: 1px solid var(--flux-border-strong);
        border-radius: var(--flux-radius);
        box-shadow: var(--flux-shadow-sm);
        transition: var(--flux-transition);
      }
      .flux-input-shell:hover:not(.flux-disabled) {
        border-color: var(--flux-accent-strong);
      }
      .flux-input-shell:focus-within {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: var(--flux-ring-offset);
      }
      .flux-disabled {
        opacity: 0.55;
      }
      input {
        flex: 1;
        min-width: 0;
        border: none;
        outline: none;
        background: transparent;
        color: var(--flux-text);
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
        padding: 0;
      }
      input::placeholder {
        color: var(--flux-text-muted);
      }
      .flux-input-icon {
        color: var(--flux-text-muted);
      }
      .flux-input-clear {
        display: inline-flex;
        border: none;
        background: transparent;
        color: var(--flux-text-muted);
        cursor: pointer;
        padding: 3px;
        border-radius: var(--flux-radius-pill);
      }
      .flux-input-clear:hover {
        color: var(--flux-text);
        background: var(--flux-accent-soft);
      }
      .flux-input-kbd {
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
        color: var(--flux-text-muted);
        background: var(--flux-surface-alt);
        border: 1px solid var(--flux-border);
        border-radius: calc(var(--flux-radius) / 2);
        padding: 0 var(--flux-space-1);
        line-height: 1.4;
      }
    `,
  ],
})
export class FluxInput extends FluxControl<string> {
  readonly value = model<string>('');
  readonly type = input<string>('text');
  readonly placeholder = input<string>('');
  readonly label = input<string>('');
  readonly icon = input<FluxIconName | null>(null);
  readonly iconTrailing = input<FluxIconName | null>(null);
  readonly kbd = input<string | null>(null);
  readonly clearable = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly autocomplete = input<string>('');

  readonly cleared = output<void>();

  protected isDisabled = (): boolean => this.disabled() || this.formDisabled();

  writeValue(value: string): void {
    this.value.set(value ?? '');
  }

  protected onInput = (event: Event): void => {
    const next = (event.target as HTMLInputElement).value;
    this.value.set(next);
    this.onChange(next);
  };

  protected clear = (): void => {
    this.value.set('');
    this.onChange('');
    this.cleared.emit();
  };
}
