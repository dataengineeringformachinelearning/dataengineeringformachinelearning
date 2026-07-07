import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import {
  VikingUptimeBar,
  type VikingUptimeStatus,
} from "../uptime-bar/uptime-bar";

export type VikingUptimeSegment = {
  status: string;
  uptime?: number;
  date?: string;
};

const normalizeUptimeStatus = (raw: string): VikingUptimeStatus => {
  const key = (raw || "").toLowerCase().replace(/-/g, "_");
  if (key === "operational" || key === "up") return "operational";
  if (key === "partial_outage" || key === "degraded") return "partial_outage";
  if (key === "major_outage" || key === "down" || key === "outage")
    return "major_outage";
  return "no_data";
};

const segmentTitle = (segment: VikingUptimeSegment): string => {
  if (segment.date) {
    return `${segment.date}: ${segment.uptime ?? 100}%`;
  }
  if (segment.uptime !== undefined) {
    return `${segment.uptime}% uptime`;
  }
  return segment.status;
};

/**
 * viking-uptime-history — full-width uptime timeline with labeled segments.
 */
@Component({
  selector: "viking-uptime-history",
  imports: [VikingUptimeBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: "viking-uptime-history",
    "[class.viking-uptime-history-compact]": "compact()",
  },
  template: `
    @if (showHeader()) {
      <div class="uptime-history-header">
        <span class="uptime-history-label">{{ label() }}</span>
        <span class="uptime-history-value">{{ headerValue() }}</span>
      </div>
    }
    <div
      class="uptime-history-bar"
      role="img"
      [attr.aria-label]="ariaLabel()"
    >
      @for (segment of segments(); track $index) {
        <viking-uptime-bar
          [status]="resolveStatus(segment)"
          [title]="segmentTitle(segment)"
        />
      }
    </div>
    @if (showLegend()) {
      <div class="uptime-history-legend">
        <span>{{ legendStart() }}</span>
        <span>{{ legendEnd() }}</span>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-2);
        width: 100%;
        min-width: 0;
        box-sizing: border-box;
      }

      .uptime-history-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viking-space-2);
        min-width: 0;
      }

      .uptime-history-label {
        font-size: var(--viking-font-size-xs);
        font-weight: var(--viking-font-weight-semibold);
        letter-spacing: var(--viking-letter-spacing-caps);
        text-transform: uppercase;
        color: var(--viking-text-muted);
      }

      .uptime-history-value {
        font-size: var(--viking-font-size-xs);
        color: var(--viking-text-muted);
        font-variant-numeric: tabular-nums;
        text-align: right;
      }

      .uptime-history-bar {
        display: flex;
        align-items: stretch;
        gap: 2px;
        width: 100%;
        min-width: 0;
        height: var(--viking-space-3);
        padding: var(--viking-space-half);
        border-radius: var(--viking-radius-full);
        background: var(--viking-surface-inset);
        box-sizing: border-box;
      }

      :host(.viking-uptime-history-compact) .uptime-history-bar {
        height: var(--viking-space-2);
        padding: var(--viking-space-px);
      }

      .uptime-history-bar viking-uptime-bar {
        flex: 1 1 0;
        min-width: 3px;
        border-radius: var(--viking-radius-pill);
      }

      .uptime-history-legend {
        display: flex;
        justify-content: space-between;
        gap: var(--viking-space-2);
        font-size: var(--viking-font-size-2xs);
        color: var(--viking-text-subtle);
      }
    `,
  ],
})
export class VikingUptimeHistory {
  readonly segments = input<VikingUptimeSegment[]>([]);
  readonly percentage = input<number | null>(null);
  readonly statusSummary = input<string>("");
  readonly label = input<string>("Uptime");
  readonly showHeader = input<boolean>(true);
  readonly showLegend = input<boolean>(true);
  readonly legendStart = input<string>("30 days ago");
  readonly legendEnd = input<string>("Today");
  readonly compact = input<boolean>(false);

  readonly headerValue = computed(() => {
    const pct = this.percentage();
    const summary = this.statusSummary();
    if (pct !== null && pct !== undefined && summary) {
      return `${pct.toFixed(2)}% — ${summary}`;
    }
    if (pct !== null && pct !== undefined) {
      return `${pct.toFixed(2)}%`;
    }
    return summary || "No data";
  });

  readonly ariaLabel = computed(() => {
    const pct = this.percentage();
    const count = this.segments().length;
    if (pct !== null && pct !== undefined) {
      return `Uptime history: ${pct.toFixed(2)}% over ${count} periods`;
    }
    return `Uptime history across ${count} periods`;
  });

  protected resolveStatus(segment: VikingUptimeSegment): VikingUptimeStatus {
    return normalizeUptimeStatus(segment.status);
  }

  protected segmentTitle(segment: VikingUptimeSegment): string {
    return segmentTitle(segment);
  }
}
