import {
  ChangeDetectionStrategy,
  Component,
  computed,
  model,
  signal,
} from "@angular/core";
import { VikingControl, provideVikingCva } from "../core/cva";
import { VikingIcon } from "../icon/icon";

interface CalendarDay {
  iso: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const toIso = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/**
 * viking-calendar — month-grid date selection.
 * Value is an ISO date string (YYYY-MM-DD). ControlValueAccessor-compatible.
 */
@Component({
  selector: "viking-calendar",
  imports: [VikingIcon],
  providers: [provideVikingCva(VikingCalendar)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="viking-calendar">
      <div class="viking-calendar-header">
        <button
          type="button"
          class="viking-calendar-nav"
          aria-label="Previous month"
          (click)="move(-1)"
        >
          <viking-icon name="chevron-left" [size]="18" />
        </button>
        <span class="viking-calendar-title" aria-live="polite">{{
          title()
        }}</span>
        <button
          type="button"
          class="viking-calendar-nav"
          aria-label="Next month"
          (click)="move(1)"
        >
          <viking-icon name="chevron-right" [size]="18" />
        </button>
      </div>
      <div
        class="viking-calendar-grid"
        role="group"
        [attr.aria-label]="title()"
      >
        @for (weekday of weekdays; track weekday) {
          <span class="viking-calendar-weekday" aria-hidden="true">{{
            weekday
          }}</span>
        }
        @for (day of days(); track day.iso) {
          <button
            type="button"
            class="viking-calendar-day"
            [class.viking-outside]="!day.inMonth"
            [class.viking-today]="day.isToday"
            [class.viking-selected]="day.iso === value()"
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
      .viking-calendar {
        display: inline-block;
        padding: var(--viking-space-2);
        background: var(--viking-surface);
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius);
        font-family: var(--viking-font-family);
      }
      .viking-calendar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viking-space-1);
        margin-bottom: var(--viking-space-1);
      }
      .viking-calendar-title {
        font-size: var(--viking-font-size);
        font-weight: 600;
        color: var(--viking-text);
      }
      .viking-calendar-nav {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: var(--viking-touch-target-comfort);
        min-height: var(--viking-touch-target-comfort);
        border: 1px solid var(--viking-border);
        background: transparent;
        color: var(--viking-text-muted);
        border-radius: var(--viking-radius-sm);
        padding: var(--viking-space-half);
        cursor: pointer;
        transition: var(--viking-transition-interactive);
        -webkit-tap-highlight-color: transparent;
      }
      .viking-calendar-nav:hover {
        color: var(--viking-text);
        border-color: var(--viking-accent-strong);
        background: var(--viking-accent-soft);
      }
      .viking-calendar-nav:active {
        transform: scale(var(--viking-state-active-scale));
      }
      .viking-calendar-nav:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: var(--viking-space-half);
      }
      .viking-calendar-weekday {
        text-align: center;
        font-size: var(--viking-font-size);
        color: var(--viking-text-muted);
        padding: calc(var(--viking-space-1) / 2);
      }
      .viking-calendar-day {
        width: 100%;
        aspect-ratio: 1;
        min-width: var(--viking-control-height-sm);
        min-height: var(--viking-control-height-sm);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid transparent;
        background: transparent;
        color: var(--viking-text);
        border-radius: var(--viking-radius-sm);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-sm);
        cursor: pointer;
        transition: var(--viking-transition-interactive);
        font-variant-numeric: tabular-nums;
        -webkit-tap-highlight-color: transparent;
      }
      .viking-calendar-day:hover:not(.viking-selected) {
        background: var(--viking-accent-soft);
      }
      .viking-calendar-day:active:not(.viking-selected) {
        transform: scale(var(--viking-state-active-scale));
      }
      .viking-calendar-day:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-outside {
        color: var(--viking-text-muted);
      }
      .viking-today {
        border-color: var(--viking-accent-strong);
      }
      .viking-selected {
        background: var(--viking-accent);
        color: var(--viking-accent-content);
        font-weight: 600;
      }
    `,
  ],
})
export class VikingCalendar extends VikingControl<string | null> {
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
      const date = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + index,
      );
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
      const [year, month] = value.split("-").map(Number);
      this.viewDate.set(new Date(year, month - 1, 1));
    }
  }

  protected move = (delta: number): void => {
    this.viewDate.update(
      (view) => new Date(view.getFullYear(), view.getMonth() + delta, 1),
    );
  };

  protected pick = (day: CalendarDay): void => {
    this.value.set(day.iso);
    this.onChange(day.iso);
    this.onTouched();
  };
}
