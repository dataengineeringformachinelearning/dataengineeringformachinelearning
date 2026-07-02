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

/**
 * flux-time-picker — dropdown time selection (https://fluxui.dev/components/time-picker).
 * Value is a 24h HH:MM string. ControlValueAccessor-compatible.
 */
@Component({
  selector: 'flux-time-picker',
  imports: [FluxIcon],
  providers: [provideFluxCva(FluxTimePicker)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'open.set(false)',
  },
  template: `
    <button
      type="button"
      class="flux-control flux-time-trigger"
      [disabled]="disabled() || formDisabled()"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="label() || placeholder()"
      aria-haspopup="listbox"
      (click)="open.set(!open())"
    >
      <flux-icon name="clock" [size]="20" />
      <span class="flux-time-value" [class.flux-time-placeholder]="!value()">
        {{ value() || placeholder() }}
      </span>
      <flux-icon [name]="open() ? 'chevron-up' : 'chevron-down'" [size]="18" />
    </button>
    @if (open()) {
      <div class="flux-time-panel" role="listbox" aria-label="Choose time">
        @for (slot of slots(); track slot) {
          <button
            type="button"
            role="option"
            class="flux-time-option"
            [class.flux-selected]="slot === value()"
            [attr.aria-selected]="slot === value()"
            (click)="pick(slot)"
          >
            {{ slot }}
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
      .flux-time-trigger {
        display: flex;
        align-items: center;
        gap: var(--flux-space-1);
        width: 100%;
        min-height: var(--flux-control-height);
        padding: 0 var(--flux-space-2);
        background: var(--flux-surface);
        border: 1px solid var(--flux-border-strong);
        border-radius: var(--flux-radius);
        box-shadow: var(--flux-shadow-sm);
        color: var(--flux-text-muted);
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
        cursor: pointer;
        transition: var(--flux-transition);
        text-align: left;
      }
      .flux-time-trigger:hover:not(:disabled) {
        border-color: var(--flux-accent-strong);
      }
      .flux-time-trigger:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: var(--flux-ring-offset);
      }
      .flux-time-trigger:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .flux-time-value {
        flex: 1;
        color: var(--flux-text);
        font-variant-numeric: tabular-nums;
      }
      .flux-time-placeholder {
        color: var(--flux-text-muted);
      }
      .flux-time-panel {
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
        max-height: 279px;
        overflow: auto;
      }
      .flux-time-option {
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
        font-variant-numeric: tabular-nums;
      }
      .flux-time-option:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: -2px;
      }
      .flux-time-option:hover {
        background: var(--flux-accent-soft);
      }
      .flux-selected {
        color: var(--flux-accent);
        font-weight: 600;
      }
    `,
  ],
})
export class FluxTimePicker extends FluxControl<string | null> {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly value = model<string | null>(null);
  readonly placeholder = input<string>('Select time');
  readonly label = input<string>('');
  readonly disabled = input<boolean>(false);
  /** Minute granularity for generated slots. */
  readonly stepMinutes = input<number>(30);

  protected readonly open = signal(false);

  protected readonly slots = computed<string[]>(() => {
    const step = Math.max(5, this.stepMinutes());
    const result: string[] = [];
    for (let minutes = 0; minutes < 24 * 60; minutes += step) {
      const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
      const mins = String(minutes % 60).padStart(2, '0');
      result.push(`${hours}:${mins}`);
    }
    return result;
  });

  writeValue(value: string | null): void {
    this.value.set(value);
  }

  protected pick = (slot: string): void => {
    this.value.set(slot);
    this.onChange(slot);
    this.onTouched();
    this.open.set(false);
  };

  protected onDocumentClick = (event: Event): void => {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  };
}
