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
  status: string | VikingUptimeStatus;
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
 * UptimeHistoryComponent — full-width segmented uptime timeline.
 *
 * Accepts date + status samples and exposes native, visible hover/focus
 * tooltips for each segment.
 *
 * @example
 * ```html
 * <viking-uptime-history
 *   [segments]="[{ date: '2026-06-13', status: 'operational', uptime: 100 }]"
 *   [percentage]="100"
 * />
 * ```
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
    <div class="uptime-history-bar" role="img" [attr.aria-label]="ariaLabel()">
      @for (segment of segments(); track $index) {
        <span
          class="uptime-history-segment"
          tabindex="0"
          [attr.aria-label]="segmentTitle(segment)"
          [attr.data-tooltip]="segmentTitle(segment)"
        >
          <viking-uptime-bar
            [status]="resolveStatus(segment)"
            [title]="segmentTitle(segment)"
          />
        </span>
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

      .uptime-history-segment {
        position: relative;
        display: flex;
        flex: 1 1 0;
        min-width: 3px;
        height: 100%;
        border-radius: var(--viking-radius-pill);
      }

      .uptime-history-segment:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
        z-index: 2;
      }

      .uptime-history-segment::after {
        content: attr(data-tooltip);
        position: absolute;
        left: 50%;
        bottom: calc(100% + var(--viking-space-1));
        transform: translateX(-50%) translateY(var(--viking-space-half));
        width: max-content;
        max-width: min(16rem, 80vw);
        padding: var(--viking-space-half) var(--viking-space-1);
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius-sm);
        background: var(--viking-surface-raised);
        color: var(--viking-text);
        box-shadow: var(--viking-shadow-md);
        font-size: var(--viking-font-size-xs);
        line-height: var(--viking-line-height-snug);
        opacity: 0;
        pointer-events: none;
        transition:
          opacity var(--viking-duration-fast) var(--viking-ease-out),
          transform var(--viking-duration-fast) var(--viking-ease-out);
        z-index: 10;
      }

      .uptime-history-segment:hover::after,
      .uptime-history-segment:focus-visible::after {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
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
export class UptimeHistoryComponent {
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

export { UptimeHistoryComponent as VikingUptimeHistory };
