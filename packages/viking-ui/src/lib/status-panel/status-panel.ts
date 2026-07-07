import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { VikingStatusPill } from "../status-pill/status-pill";
import { VikingUptimeHistory, type VikingUptimeSegment } from "../uptime-history/uptime-history";
import type { VikingTone } from "../../core/types";

/**
 * viking-status-panel — service/component status card with header, stats, and uptime bar.
 */
@Component({
  selector: "viking-status-panel",
  imports: [VikingStatusPill, VikingUptimeHistory],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: "viking-status-panel",
    "[class.viking-status-panel-compact]": "compact()",
  },
  template: `
    <header class="status-panel-header">
      <div class="status-panel-title-wrap">
        <h3 class="status-panel-title">{{ title() }}</h3>
        @if (subtitle()) {
          <p class="status-panel-subtitle">{{ subtitle() }}</p>
        }
      </div>
      <viking-status-pill [tone]="statusTone()" [dot]="true">
        {{ status() }}
      </viking-status-pill>
    </header>

    <div class="status-panel-body">
      <ng-content />
      @if (showUptime()) {
        <viking-uptime-history
          [segments]="uptimeSegments()"
          [percentage]="uptimePercentage()"
          [statusSummary]="uptimeSummary()"
          [compact]="compact()"
          [showLegend]="showUptimeLegend()"
        />
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-3);
        width: 100%;
        min-width: 0;
        padding: var(--viking-card-padding);
        border-radius: var(--viking-radius-lg);
        border: 1px solid var(--viking-border);
        background: var(--viking-surface-recipe, var(--viking-surface));
        box-sizing: border-box;
      }

      :host(.viking-status-panel-compact) {
        padding: var(--viking-card-padding-compact);
        gap: var(--viking-space-2);
      }

      .status-panel-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--viking-space-3);
        min-width: 0;
        padding-bottom: var(--viking-space-2);
        border-bottom: 1px solid var(--viking-border-subtle);
      }

      .status-panel-title-wrap {
        display: grid;
        gap: var(--viking-space-1);
        min-width: 0;
      }

      .status-panel-title {
        margin: 0;
        font-size: var(--viking-font-size-lg);
        font-weight: var(--viking-font-weight-bold);
        letter-spacing: var(--viking-letter-spacing-tight);
        line-height: var(--viking-line-height-tight);
        color: var(--viking-text);
      }

      .status-panel-subtitle {
        margin: 0;
        font-size: var(--viking-font-size-sm);
        color: var(--viking-text-muted);
        line-height: var(--viking-line-height-relaxed);
      }

      .status-panel-body {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-3);
        width: 100%;
        min-width: 0;
      }

      :host(.viking-status-panel-compact) .status-panel-body {
        gap: var(--viking-space-2);
      }
    `,
  ],
})
export class VikingStatusPanel {
  readonly title = input.required<string>();
  readonly subtitle = input<string>("");
  readonly status = input<string>("Operational");
  readonly statusTone = input<VikingTone>("success");
  readonly uptimeSegments = input<VikingUptimeSegment[]>([]);
  readonly uptimePercentage = input<number | null>(null);
  readonly uptimeSummary = input<string>("No current issues");
  readonly showUptime = input<boolean>(true);
  readonly showUptimeLegend = input<boolean>(true);
  readonly compact = input<boolean>(false);
}
