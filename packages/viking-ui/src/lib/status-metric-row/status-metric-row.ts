import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { VikingIcon } from "../icon/icon";
import type { VikingIconName } from "../../core/icons";

/**
 * viking-status-metric-row — icon + title/subtitle + value row for status cards.
 */
@Component({
  selector: "viking-status-metric-row",
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "viking-status-metric-row ml-stat-panel" },
  template: `
    <div class="stat-info">
      <viking-icon
        [name]="icon()"
        [size]="22"
        color="accent"
        [backdrop]="true"
      />
      <div>
        <span class="stat-title">{{ title() }}</span>
        @if (subtitle()) {
          <span class="stat-subtitle">{{ subtitle() }}</span>
        }
      </div>
    </div>
    <div class="stat-value-container">
      <span class="stat-value"><ng-content />{{ value() }}</span>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viking-space-2);
        padding: var(--viking-space-2);
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius-lg);
        background: var(--viking-surface);
      }
      .stat-info {
        display: flex;
        align-items: center;
        gap: var(--viking-space-2);
        min-width: 0;
      }
      .stat-title {
        display: block;
        font-size: var(--viking-font-size-sm);
        font-weight: var(--viking-font-weight-semibold);
        color: var(--viking-text);
      }
      .stat-subtitle {
        display: block;
        font-size: var(--viking-font-size-sm);
        color: var(--viking-text-muted);
      }
      .stat-value {
        font-size: calc(var(--viking-font-size) * 1.25);
        font-weight: 700;
        color: var(--viking-text);
      }
    `,
  ],
})
export class VikingStatusMetricRow {
  readonly icon = input.required<VikingIconName>();
  readonly title = input.required<string>();
  readonly subtitle = input<string>("");
  readonly value = input<string | number>("");
}
