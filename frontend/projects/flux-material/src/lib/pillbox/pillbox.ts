import { ChangeDetectionStrategy, Component, input, model, signal } from '@angular/core';
import { FluxControl, provideFluxCva } from '../core/cva';
import { FluxIcon } from '../icon/icon';

/**
 * flux-pillbox — multi-value tag input (https://fluxui.dev/components/pillbox).
 * Type and press Enter (or comma) to add pills. ControlValueAccessor-compatible.
 */
@Component({
  selector: 'flux-pillbox',
  imports: [FluxIcon],
  providers: [provideFluxCva(FluxPillbox)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flux-control flux-pillbox"
      [class.flux-disabled]="disabled() || formDisabled()"
      role="group"
      [attr.aria-label]="label() || 'Tags'"
    >
      @for (pill of values(); track pill) {
        <span class="flux-pill">
          {{ pill }}
          <button
            type="button"
            class="flux-pill-remove"
            [attr.aria-label]="'Remove ' + pill"
            [disabled]="disabled() || formDisabled()"
            (click)="remove(pill)"
          >
            <flux-icon name="x" [size]="13" />
          </button>
        </span>
      }
      <input
        type="text"
        [placeholder]="values().length === 0 ? placeholder() : ''"
        [value]="draft()"
        [disabled]="disabled() || formDisabled()"
        [attr.aria-label]="label() || placeholder() || 'Add tag'"
        (input)="draft.set($any($event.target).value)"
        (keydown)="onKeydown($event)"
        (blur)="onTouched()"
      />
    </div>
  `,
  styles: [
    `
      .flux-pillbox {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: calc(var(--flux-space-1) / 1.5);
        min-height: var(--flux-control-height);
        padding: calc(var(--flux-space-1) / 1.5) var(--flux-space-1);
        background: var(--flux-surface);
        border: 1px solid var(--flux-border-strong);
        border-radius: var(--flux-radius);
        box-shadow: var(--flux-shadow-sm);
        transition: var(--flux-transition);
        cursor: text;
      }
      .flux-pillbox:focus-within {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: var(--flux-ring-offset);
      }
      .flux-disabled {
        opacity: 0.55;
      }
      .flux-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
        font-weight: 500;
        color: var(--flux-text);
        background: var(--flux-accent-soft);
        border: 1px solid var(--flux-accent-strong);
        border-radius: var(--flux-radius-pill);
        padding: 2px var(--flux-space-1);
        line-height: 1.35;
      }
      .flux-pill-remove {
        display: inline-flex;
        border: none;
        background: transparent;
        color: var(--flux-text-muted);
        cursor: pointer;
        padding: 2px;
        border-radius: var(--flux-radius-pill);
      }
      .flux-pill-remove:hover {
        color: var(--flux-danger);
      }
      .flux-pill-remove:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: 1px;
      }
      input {
        flex: 1;
        min-width: 108px;
        border: none;
        outline: none;
        background: transparent;
        color: var(--flux-text);
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
        padding: calc(var(--flux-space-1) / 2);
      }
      input::placeholder {
        color: var(--flux-text-muted);
      }
    `,
  ],
})
export class FluxPillbox extends FluxControl<string[]> {
  readonly values = model<string[]>([]);
  readonly placeholder = input<string>('Add a tag…');
  readonly label = input<string>('');
  readonly disabled = input<boolean>(false);

  protected readonly draft = signal('');

  writeValue(value: string[]): void {
    this.values.set(value ?? []);
  }

  protected onKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      const next = this.draft().trim().replace(/,$/, '');
      if (next && !this.values().includes(next)) {
        this.values.update(list => [...list, next]);
        this.onChange(this.values());
      }
      this.draft.set('');
    } else if (event.key === 'Backspace' && !this.draft() && this.values().length > 0) {
      this.remove(this.values()[this.values().length - 1]);
    }
  };

  protected remove = (pill: string): void => {
    this.values.update(list => list.filter(item => item !== pill));
    this.onChange(this.values());
  };
}
