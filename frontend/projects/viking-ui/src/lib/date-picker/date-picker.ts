import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { VikingControl, provideVikingCva } from '../core/cva';
import { VikingCalendar } from '../calendar/calendar';
import { VikingIcon } from '../icon/icon';

/**
 * viking-date-picker — input + calendar popover.
 * Value is an ISO date string (YYYY-MM-DD). ControlValueAccessor-compatible.
 */
@Component({
  selector: 'viking-date-picker',
  imports: [VikingCalendar, VikingIcon],
  providers: [provideVikingCva(VikingDatePicker)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'open.set(false)',
  },
  template: `
    <button
      type="button"
      class="viking-control viking-date-trigger"
      [disabled]="disabled() || formDisabled()"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="label() || placeholder()"
      aria-haspopup="dialog"
      (click)="open.set(!open())"
    >
      <viking-icon name="calendar" [size]="20" />
      <span class="viking-date-value" [class.viking-date-placeholder]="!value()">
        {{ value() || placeholder() }}
      </span>
      <viking-icon [name]="open() ? 'chevron-up' : 'chevron-down'" [size]="18" />
    </button>
    @if (open()) {
      <div class="viking-date-panel" role="dialog" aria-label="Choose date">
        <viking-calendar [value]="value()" (valueChange)="pick($event)" />
      </div>
    }
  `,
  styles: [
    `
      :host {
        position: relative;
        display: block;
      }
      .viking-date-trigger {
        display: flex;
        align-items: center;
        gap: var(--viking-space-1);
        width: 100%;
        min-height: var(--viking-control-height);
        padding: 0 var(--viking-space-2);
        background: var(--viking-surface);
        border: 1px solid var(--viking-border-strong);
        border-radius: var(--viking-radius);
        box-shadow: var(--viking-shadow-sm);
        color: var(--viking-text-muted);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size);
        cursor: pointer;
        transition: var(--viking-transition);
        text-align: left;
      }
      .viking-date-trigger:hover:not(:disabled) {
        border-color: var(--viking-accent-strong);
      }
      .viking-date-trigger:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-date-trigger:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .viking-date-value {
        flex: 1;
        color: var(--viking-text);
        font-variant-numeric: tabular-nums;
      }
      .viking-date-placeholder {
        color: var(--viking-text-muted);
      }
      .viking-date-panel {
        position: absolute;
        top: calc(100% + var(--viking-space-1));
        left: 0;
        z-index: var(--viking-z-overlay);
        box-shadow: var(--viking-shadow-md);
        border-radius: var(--viking-radius);
      }
    `,
  ],
})
export class VikingDatePicker extends VikingControl<string | null> {
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
