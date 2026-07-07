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
        min-height: var(--viking-space-7);
        padding: var(--viking-space-2);
        border: 1px solid
          color-mix(
            in srgb,
            var(--viking-border-strong) 48%,
            var(--viking-border)
          );
        border-radius: var(--viking-radius-md);
        background:
          linear-gradient(
            180deg,
            color-mix(in srgb, var(--viking-metallic-100) 6%, transparent) 0%,
            transparent 38%
          ),
          color-mix(
            in srgb,
            var(--viking-surface-alt) 86%,
            var(--viking-surface)
          );
        box-shadow:
          inset 0 1px 0
            color-mix(in srgb, var(--viking-white-pure) 6%, transparent),
          var(--viking-shadow-xs);
        box-sizing: border-box;
        transition: var(--viking-transition-interactive);
      }
      :host(:hover) {
        border-color: var(--viking-accent-strong);
        box-shadow: var(--viking-shadow-sm);
      }
      .stat-info {
        display: flex;
        align-items: center;
        gap: var(--viking-space-2);
        min-width: 0;
      }
      .stat-title {
        display: block;
        font-size: var(--viking-font-size-xs);
        font-weight: var(--viking-font-weight-semibold);
        letter-spacing: var(--viking-letter-spacing-caps);
        text-transform: uppercase;
        color: var(--viking-text-muted);
      }
      .stat-subtitle {
        display: block;
        font-size: var(--viking-font-size-2xs);
        color: var(--viking-text-subtle);
        margin-top: var(--viking-space-px);
      }
      .stat-value-container {
        display: inline-flex;
        justify-content: flex-end;
        min-width: max-content;
      }
      .stat-value {
        font-size: calc(var(--viking-font-size) * 1.25);
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
