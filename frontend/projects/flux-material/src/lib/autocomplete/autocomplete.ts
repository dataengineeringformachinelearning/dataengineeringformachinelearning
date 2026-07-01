import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { FluxControl, provideFluxCva } from '../core/cva';
import { FluxIcon } from '../icon/icon';
import { fluxUid } from '../core/uid';

/**
 * flux-autocomplete — text input with filtered suggestions
 * (https://fluxui.dev/components/autocomplete). ControlValueAccessor-compatible.
 */
@Component({
  selector: 'flux-autocomplete',
  imports: [FluxIcon],
  providers: [provideFluxCva(FluxAutocomplete)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:click)': 'onDocumentClick($event)' },
  template: `
    <div class="flux-control flux-autocomplete-shell">
      <flux-icon class="flux-autocomplete-icon" name="search" [size]="20" />
      <input
        type="text"
        role="combobox"
        [placeholder]="placeholder()"
        [value]="value()"
        [disabled]="disabled() || formDisabled()"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="panelId"
        [attr.aria-label]="label() || placeholder() || 'Autocomplete'"
        aria-autocomplete="list"
        (input)="onInput($event)"
        (focus)="open.set(true)"
        (keydown)="onKeydown($event)"
        (blur)="onTouched()"
      />
    </div>
    @if (open() && filtered().length > 0) {
      <div class="flux-autocomplete-panel" role="listbox" [id]="panelId">
        @for (item of filtered(); track item; let index = $index) {
          <button
            type="button"
            role="option"
            class="flux-autocomplete-option"
            [class.flux-active]="index === activeIndex()"
            [attr.aria-selected]="index === activeIndex()"
            (mousedown)="$event.preventDefault()"
            (click)="pick(item)"
            (mouseenter)="activeIndex.set(index)"
          >
            {{ item }}
          </button>
        }
      </div>
    }
  `,
  styles: [
    `
      :host {
        position: relative;
        display: block;
      }
      .flux-autocomplete-shell {
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
      .flux-autocomplete-shell:focus-within {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: var(--flux-ring-offset);
      }
      .flux-autocomplete-icon {
        color: var(--flux-text-muted);
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
      }
      input::placeholder {
        color: var(--flux-text-muted);
      }
      .flux-autocomplete-panel {
        position: absolute;
        top: calc(100% + var(--flux-space-1));
        left: 0;
        right: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin: 0;
        padding: var(--flux-space-1);
        background: var(--flux-surface);
        border: 1px solid var(--flux-border-strong);
        border-radius: var(--flux-radius);
        box-shadow: var(--flux-shadow-md);
        z-index: var(--flux-z-overlay);
        max-height: 288px;
        overflow: auto;
      }
      .flux-autocomplete-option {
        padding: var(--flux-space-1);
        border: none;
        background: transparent;
        text-align: left;
        width: 100%;
        border-radius: calc(var(--flux-radius) / 1.5);
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
        color: var(--flux-text);
        cursor: pointer;
      }
      .flux-autocomplete-option:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: -2px;
      }
      .flux-active {
        background: var(--flux-accent-soft);
      }
    `,
  ],
})
export class FluxAutocomplete extends FluxControl<string> {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly suggestions = input.required<string[]>();
  readonly value = model<string>('');
  readonly placeholder = input<string>('');
  readonly label = input<string>('');
  readonly disabled = input<boolean>(false);

  readonly selected = output<string>();

  protected readonly open = signal(false);
  protected readonly activeIndex = signal(0);
  protected readonly panelId = fluxUid('flux-autocomplete-panel');

  protected readonly filtered = computed(() => {
    const query = this.value().toLowerCase().trim();
    if (!query) {
      return this.suggestions();
    }
    return this.suggestions().filter(item => item.toLowerCase().includes(query));
  });

  writeValue(value: string): void {
    this.value.set(value ?? '');
  }

  protected onInput = (event: Event): void => {
    const next = (event.target as HTMLInputElement).value;
    this.value.set(next);
    this.onChange(next);
    this.open.set(true);
    this.activeIndex.set(0);
  };

  protected pick = (item: string): void => {
    this.value.set(item);
    this.onChange(item);
    this.selected.emit(item);
    this.open.set(false);
  };

  protected onKeydown = (event: KeyboardEvent): void => {
    if (!this.open()) {
      return;
    }
    const items = this.filtered();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.activeIndex.update(index => Math.min(items.length - 1, index + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeIndex.update(index => Math.max(0, index - 1));
        break;
      case 'Enter':
        if (items[this.activeIndex()]) {
          event.preventDefault();
          this.pick(items[this.activeIndex()]);
        }
        break;
      case 'Escape':
        this.open.set(false);
        break;
    }
  };

  protected onDocumentClick = (event: Event): void => {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  };
}
