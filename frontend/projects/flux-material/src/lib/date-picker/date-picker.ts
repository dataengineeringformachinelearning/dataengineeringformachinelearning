import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { FluxControl, provideFluxCva } from '../core/cva';
import { FluxCalendar } from '../calendar/calendar';
import { FluxIcon } from '../icon/icon';

/**
 * flux-date-picker — input + calendar popover (https://fluxui.dev/components/date-picker).
 * Value is an ISO date string (YYYY-MM-DD). ControlValueAccessor-compatible.
 */
@Component({
  selector: 'flux-date-picker',
  imports: [FluxCalendar, FluxIcon],
  providers: [provideFluxCva(FluxDatePicker)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'open.set(false)',
  },
  template: `
    <button
      type="button"
      class="flux-control flux-date-trigger"
      [disabled]="disabled() || formDisabled()"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="label() || placeholder()"
      aria-haspopup="dialog"
      (click)="open.set(!open())"
    >
      <flux-icon name="calendar" [size]="20" />
      <span class="flux-date-value" [class.flux-date-placeholder]="!value()">
        {{ value() || placeholder() }}
      </span>
      <flux-icon [name]="open() ? 'chevron-up' : 'chevron-down'" [size]="18" />
    </button>
    @if (open()) {
      <div class="flux-date-panel" role="dialog" aria-label="Choose date">
        <flux-calendar [value]="value()" (valueChange)="pick($event)" />
      </div>
    }
  `,
  styles: [
    `
      :host {
        position: relative;
        display: block;
      }
      .flux-date-trigger {
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
      .flux-date-trigger:hover:not(:disabled) {
        border-color: var(--flux-accent-strong);
      }
      .flux-date-trigger:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: var(--flux-ring-offset);
      }
      .flux-date-trigger:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .flux-date-value {
        flex: 1;
        color: var(--flux-text);
        font-variant-numeric: tabular-nums;
      }
      .flux-date-placeholder {
        color: var(--flux-text-muted);
      }
      .flux-date-panel {
        position: absolute;
        top: calc(100% + var(--flux-space-1));
        left: 0;
        z-index: var(--flux-z-overlay);
        box-shadow: var(--flux-shadow-md);
        border-radius: var(--flux-radius);
      }
    `,
  ],
})
export class FluxDatePicker extends FluxControl<string | null> {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly value = model<string | null>(null);
  readonly placeholder = input<string>('Select date');
  readonly label = input<string>('');
  readonly disabled = input<boolean>(false);

  protected readonly open = signal(false);

  writeValue(value: string | null): void {
    this.value.set(value);
  }

  protected pick = (iso: string | null): void => {
    this.value.set(iso);
    this.onChange(iso);
    this.onTouched();
    this.open.set(false);
  };

  protected onDocumentClick = (event: Event): void => {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  };
}
