import { ChangeDetectionStrategy, Component, computed, model, signal } from '@angular/core';
import { FluxControl, provideFluxCva } from '../core/cva';
import { FluxIcon } from '../icon/icon';

interface CalendarDay {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const toIso = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * flux-calendar — month-grid date selection (https://fluxui.dev/components/calendar).
 * Value is an ISO date string (YYYY-MM-DD). ControlValueAccessor-compatible.
 */
@Component({
  selector: 'flux-calendar',
  imports: [FluxIcon],
  providers: [provideFluxCva(FluxCalendar)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flux-calendar">
      <div class="flux-calendar-header">
        <button
          type="button"
          class="flux-calendar-nav"
          aria-label="Previous month"
          (click)="move(-1)"
        >
          <flux-icon name="chevron-left" [size]="18" />
        </button>
        <span class="flux-calendar-title" aria-live="polite">{{ title() }}</span>
        <button type="button" class="flux-calendar-nav" aria-label="Next month" (click)="move(1)">
          <flux-icon name="chevron-right" [size]="18" />
        </button>
      </div>
      <div class="flux-calendar-grid" role="group" [attr.aria-label]="title()">
        @for (weekday of weekdays; track weekday) {
          <span class="flux-calendar-weekday" aria-hidden="true">{{ weekday }}</span>
        }
        @for (day of days(); track day.iso) {
          <button
            type="button"
            class="flux-calendar-day"
            [class.flux-outside]="!day.inMonth"
            [class.flux-today]="day.isToday"
            [class.flux-selected]="day.iso === value()"
            [attr.aria-label]="day.iso"
            [attr.aria-pressed]="day.iso === value()"
            (click)="pick(day)"
          >
            {{ day.day }}
          </button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .flux-calendar {
        display: inline-block;
        padding: var(--flux-space-2);
        background: var(--flux-surface);
        border: 1px solid var(--flux-border);
        border-radius: var(--flux-radius);
        font-family: var(--flux-font-family);
      }
      .flux-calendar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--flux-space-1);
        margin-bottom: var(--flux-space-1);
      }
      .flux-calendar-title {
        font-size: var(--flux-font-size);
        font-weight: 600;
        color: var(--flux-text);
      }
      .flux-calendar-nav {
        display: inline-flex;
        border: 1px solid var(--flux-border);
        background: transparent;
        color: var(--flux-text-muted);
        border-radius: calc(var(--flux-radius) / 1.5);
        padding: 5px;
        cursor: pointer;
        transition: var(--flux-transition);
      }
      .flux-calendar-nav:hover {
        color: var(--flux-text);
        border-color: var(--flux-accent-strong);
      }
      .flux-calendar-nav:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: 1px;
      }
      .flux-calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 2px;
      }
      .flux-calendar-weekday {
        text-align: center;
        font-size: var(--flux-font-size);
        color: var(--flux-text-muted);
        padding: calc(var(--flux-space-1) / 2);
      }
      .flux-calendar-day {
        width: var(--flux-space-4);
        height: var(--flux-space-4);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid transparent;
        background: transparent;
        color: var(--flux-text);
        border-radius: calc(var(--flux-radius) / 1.5);
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
        cursor: pointer;
        transition: var(--flux-transition);
        font-variant-numeric: tabular-nums;
      }
      .flux-calendar-day:hover:not(.flux-selected) {
        background: var(--flux-accent-soft);
      }
      .flux-calendar-day:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: 1px;
      }
      .flux-outside {
        color: var(--flux-text-muted);
      }
      .flux-today {
        border-color: var(--flux-accent-strong);
      }
      .flux-selected {
        background: var(--flux-accent);
        color: var(--flux-accent-content);
        font-weight: 600;
      }
    `,
  ],
})
export class FluxCalendar extends FluxControl<string | null> {
  readonly value = model<string | null>(null);

  protected readonly weekdays = WEEKDAYS;
  protected readonly viewDate = signal(new Date());

  protected readonly title = computed(() => {
    const view = this.viewDate();
    return `${MONTHS[view.getMonth()]} ${view.getFullYear()}`;
  });

  protected readonly days = computed<CalendarDay[]>(() => {
    const view = this.viewDate();
    const year = view.getFullYear();
    const month = view.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const start = new Date(year, month, 1 - firstOfMonth.getDay());
    const todayIso = toIso(new Date());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      const iso = toIso(date);
      return {
        iso,
        day: date.getDate(),
        inMonth: date.getMonth() === month,
        isToday: iso === todayIso,
      };
    });
  });

  writeValue(value: string | null): void {
    this.value.set(value);
    if (value) {
      const [year, month] = value.split('-').map(Number);
      this.viewDate.set(new Date(year, month - 1, 1));
    }
  }

  protected move = (delta: number): void => {
    this.viewDate.update(view => new Date(view.getFullYear(), view.getMonth() + delta, 1));
  };

  protected pick = (day: CalendarDay): void => {
    this.value.set(day.iso);
    this.onChange(day.iso);
    this.onTouched();
  };
}
