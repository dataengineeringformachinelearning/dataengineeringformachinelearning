import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { FluxControl, provideFluxCva } from '../core/cva';
import { FluxIcon } from '../icon/icon';
import { FluxSelectOption } from '../core/types';

/**
 * flux-select — custom listbox select (https://fluxui.dev/components/select).
 * ControlValueAccessor-compatible with full keyboard support.
 */
@Component({
  selector: 'flux-select',
  imports: [FluxIcon],
  providers: [provideFluxCva(FluxSelect)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:click)': 'onDocumentClick($event)' },
  template: `
    <button
      type="button"
      class="flux-control flux-select-trigger"
      [disabled]="disabled() || formDisabled()"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="label() || placeholder()"
      aria-haspopup="listbox"
      (click)="toggle()"
      (keydown)="onKeydown($event)"
    >
      <span class="flux-select-value" [class.flux-select-placeholder]="!selectedLabel()">
        {{ selectedLabel() || placeholder() }}
      </span>
      <flux-icon [name]="open() ? 'chevron-up' : 'chevron-down'" [size]="18" />
    </button>
    @if (open()) {
      <div class="flux-select-panel" role="listbox" [attr.aria-label]="label() || placeholder()">
        @for (option of options(); track option.label; let index = $index) {
          <button
            type="button"
            role="option"
            class="flux-select-option"
            [class.flux-active]="index === activeIndex()"
            [class.flux-selected]="option.value === value()"
            [disabled]="option.disabled"
            [attr.aria-selected]="option.value === value()"
            (click)="pick(option)"
            (mouseenter)="activeIndex.set(index)"
          >
            <span class="flux-select-option-label">{{ option.label }}</span>
            @if (option.value === value()) {
              <flux-icon name="check" [size]="16" />
            }
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
      .flux-select-trigger {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--flux-space-1);
        width: 100%;
        min-height: var(--flux-control-height);
        padding: 0 var(--flux-space-2);
        background: var(--flux-surface);
        border: 1px solid var(--flux-border-strong);
        border-radius: var(--flux-radius);
        box-shadow: var(--flux-shadow-sm);
        color: var(--flux-text);
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
        cursor: pointer;
        transition: var(--flux-transition);
        text-align: left;
      }
      .flux-select-trigger:hover:not(:disabled) {
        border-color: var(--flux-accent-strong);
      }
      .flux-select-trigger:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: var(--flux-ring-offset);
      }
      .flux-select-trigger:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .flux-select-placeholder {
        color: var(--flux-text-muted);
      }
      .flux-select-panel {
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
        max-height: 315px;
        overflow: auto;
      }
      .flux-select-option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--flux-space-1);
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
      .flux-select-option:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .flux-select-option:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: -2px;
      }
      .flux-active {
        background: var(--flux-accent-soft);
      }
      .flux-selected {
        font-weight: 600;
        color: var(--flux-accent);
      }
    `,
  ],
})
export class FluxSelect extends FluxControl<unknown> {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly options = input.required<FluxSelectOption[]>();
  readonly value = model<unknown>(null);
  readonly placeholder = input<string>('Select…');
  readonly label = input<string>('');
  readonly disabled = input<boolean>(false);

  protected readonly open = signal(false);
  protected readonly activeIndex = signal(0);

  protected readonly selectedLabel = computed(
    () => this.options().find(option => option.value === this.value())?.label ?? '',
  );

  writeValue(value: unknown): void {
    this.value.set(value);
  }

  protected toggle = (): void => {
    this.open.update(value => !value);
    if (this.open()) {
      const index = this.options().findIndex(option => option.value === this.value());
      this.activeIndex.set(Math.max(0, index));
    }
  };

  protected pick = (option: FluxSelectOption): void => {
    if (option.disabled) {
      return;
    }
    this.value.set(option.value);
    this.onChange(option.value);
    this.onTouched();
    this.open.set(false);
  };

  protected onKeydown = (event: KeyboardEvent): void => {
    const options = this.options();
    if (!this.open()) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        this.toggle();
      }
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.activeIndex.update(index => Math.min(options.length - 1, index + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeIndex.update(index => Math.max(0, index - 1));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.pick(options[this.activeIndex()]);
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
