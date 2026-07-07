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
        width: 100%;
        min-width: 0;
        min-height: var(--viking-space-6);
        padding: var(--viking-space-1-5);
        border-radius: var(--viking-radius-sm);
        background: color-mix(
          in srgb,
          var(--viking-surface-alt) 82%,
          var(--viking-surface)
        );
        box-sizing: border-box;
        transition: background var(--viking-duration-fast)
          var(--viking-ease-out);
      }
      :host(:hover) {
        background: color-mix(
          in srgb,
          var(--viking-surface-alt) 92%,
          var(--viking-surface)
        );
      }
      .stat-info {
        display: flex;
        align-items: center;
        gap: var(--viking-space-2);
        min-width: 0;
      }
      .stat-title {
        display: block;
        font-size: var(--viking-font-size-2xs);
        font-weight: var(--viking-font-weight-semibold);
        letter-spacing: var(--viking-letter-spacing-caps);
        text-transform: uppercase;
        color: var(--viking-text-muted);
      }
      .stat-subtitle {
        display: block;
        font-size: var(--viking-font-size-3xs);
        color: var(--viking-text-subtle);
        margin-top: var(--viking-space-px);
      }
      .stat-value-container {
        display: inline-flex;
        justify-content: flex-end;
        min-width: max-content;
      }
      .stat-value {
        font-size: calc(var(--viking-font-size) * 1.15);
        font-weight: var(--viking-font-weight-bold);
        color: var(--viking-accent-strong);
        font-variant-numeric: tabular-nums;
        text-align: right;
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
