import { DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import type { SuiteActivityEntry } from "../../core/activity-log";

/**
 * Compact activity / audit rows for soft-chrome actions (FORJD ADR-0027).
 * Chrome: suite-components.css (`.suite-activity`).
 */
@Component({
  selector: "viking-activity-list",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  host: {
    class: "suite-activity viking-activity fj-activity",
  },
  template: `
    @if (entries().length === 0) {
      <p class="suite-activity-empty viking-activity-empty fj-activity-empty">
        {{ emptyLabel() }}
      </p>
    } @else {
      <ol class="suite-activity-list viking-activity-list fj-activity-list">
        @for (entry of entries(); track entry.id) {
          <li class="suite-activity-item viking-activity-item fj-activity-item">
            <div
              class="suite-activity-main viking-activity-main fj-activity-main"
            >
              <span
                class="suite-activity-label viking-activity-label fj-activity-label"
                >{{ entry.label }}</span
              >
              @if (entry.detail) {
                <span
                  class="suite-activity-detail viking-activity-detail fj-activity-detail"
                  >{{ entry.detail }}</span
                >
              }
            </div>
            <time
              class="suite-activity-time viking-activity-time fj-activity-time"
              [attr.datetime]="entry.at | date: 'yyyy-MM-ddTHH:mm:ss.SSSZ'"
              >{{ entry.at | date: "short" }}</time
            >
          </li>
        }
      </ol>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class VikingActivityList {
  readonly entries = input.required<readonly SuiteActivityEntry[]>();
  readonly emptyLabel = input("No recent activity yet.");
}
