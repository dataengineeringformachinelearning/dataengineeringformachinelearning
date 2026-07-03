import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { VikingControl, provideVikingCva } from '../core/cva';
import { VikingIcon } from '../icon/icon';
import { VikingIconName } from '../core/icons';
import { VikingSpinner } from '../spinner/spinner';

/**
 * viking-input — text input with icons, kbd hint and clearable state
 *. ControlValueAccessor-compatible.
 */
@Component({
  selector: 'viking-input',
  imports: [VikingIcon, VikingSpinner],
  providers: [provideVikingCva(VikingInput)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="viking-control viking-input-shell"
      [class.viking-disabled]="isDisabled()"
      [class.viking-loading]="loading()"
    >
      @if (icon()) {
        <viking-icon class="viking-input-icon" [name]="icon()!" [size]="20" />
      }
      <input
        [type]="type()"
        [placeholder]="placeholder()"
        [value]="value()"
        [disabled]="isDisabled() || loading()"
        [attr.aria-label]="label() || placeholder() || 'Text input'"
        [attr.aria-busy]="loading() ? 'true' : null"
        [attr.autocomplete]="autocomplete() || null"
        (input)="onInput($event)"
        (blur)="onTouched()"
      />
      @if (loading()) {
        <viking-spinner [size]="16" label="Loading input" />
      } @else if (clearable() && value()) {
        <button type="button" class="viking-input-clear" aria-label="Clear input" (click)="clear()">
          <viking-icon name="x" [size]="16" />
        </button>
      }
      @if (kbd()) {
        <kbd class="viking-input-kbd">{{ kbd() }}</kbd>
      }
      @if (iconTrailing()) {
        <viking-icon class="viking-input-icon" [name]="iconTrailing()!" [size]="20" />
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .viking-input-shell {
        display: flex;
        align-items: center;
        gap: var(--viking-space-1);
        min-height: var(--viking-control-height);
        padding: 0 var(--viking-space-2);
        background: var(--viking-surface);
        border: 1px solid var(--viking-border-strong);
        border-radius: var(--viking-radius);
        box-shadow: var(--viking-shadow-sm);
        transition: var(--viking-transition-interactive);
      }
      .viking-input-shell:hover:not(.viking-disabled):not(.viking-loading) {
        border-color: var(--viking-accent-strong);
        box-shadow: var(--viking-shadow-md);
      }
      .viking-input-shell:focus-within:not(.viking-loading) {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
        border-color: var(--viking-accent);
      }
      .viking-disabled,
      .viking-loading {
        opacity: var(--viking-state-disabled-opacity);
      }
      .viking-loading {
        cursor: wait;
      }
      input {
        flex: 1;
        min-width: 0;
        border: none;
        outline: none !important;
        background: transparent;
        color: var(--viking-text);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size);
        padding: 0;
      }
      input::placeholder {
        color: var(--viking-text-muted);
      }
      .viking-input-icon {
        color: var(--viking-text-muted);
      }
      .viking-input-clear {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: var(--viking-touch-target-comfort);
        min-height: var(--viking-touch-target-comfort);
        border: none;
        background: transparent;
        color: var(--viking-text-muted);
        cursor: pointer;
        padding: var(--viking-space-half);
        border-radius: var(--viking-radius-pill);
        transition: var(--viking-transition-interactive);
        position: relative;
        flex-shrink: 0;
        -webkit-tap-highlight-color: transparent;
      }
      .viking-input-clear:hover {
        color: var(--viking-text);
        background: var(--viking-accent-soft);
      }
      .viking-input-clear:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-input-clear:active {
        transform: scale(var(--viking-state-active-scale));
      }
      .viking-input-kbd {
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size);
        color: var(--viking-text-muted);
        background: var(--viking-surface-alt);
        border: 1px solid var(--viking-border);
        border-radius: calc(var(--viking-radius) / 2);
        padding: 0 var(--viking-space-1);
        line-height: 1.4;
      }
    `,
  ],
})
export class VikingInput extends VikingControl<string> {
  readonly value = model<string>('');
  readonly type = input<string>('text');
  readonly placeholder = input<string>('');
  readonly label = input<string>('');
  readonly icon = input<VikingIconName | null>(null);
  readonly iconTrailing = input<VikingIconName | null>(null);
  readonly kbd = input<string | null>(null);
  readonly clearable = input<boolean>(false);
  readonly loading = input<boolean>(false);
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
