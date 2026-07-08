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

export type UptimeHistoryDataPoint = {
  date: string;
  status: "up" | "down" | "partial";
};

const normalizeUptimeStatus = (raw: string): VikingUptimeStatus => {
  const key = (raw || "").toLowerCase().replace(/-/g, "_");
  if (key === "operational" || key === "up") return "operational";
  if (key === "partial_outage" || key === "degraded" || key === "partial")
    return "partial_outage";
  if (key === "major_outage" || key === "down" || key === "outage")
    return "major_outage";
  return "no_data";
};

const formatStatus = (raw: string): string => {
  const normalized = normalizeUptimeStatus(raw);
  if (normalized === "operational") return "Up";
  if (normalized === "partial_outage") return "Partial";
  if (normalized === "major_outage") return "Down";
  return "No data";
};

const segmentTitle = (segment: VikingUptimeSegment): string => {
  if (segment.date) {
    if (segment.uptime !== undefined) {
      return `${segment.date}: ${formatStatus(segment.status)} (${segment.uptime}%)`;
    }
    return `${segment.date}: ${formatStatus(segment.status)}`;
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
 *   [data]="[{ date: '2026-06-13', status: 'up' }]"
 *   [height]="24"
 *   [showLabels]="true"
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
    "[style.--viking-uptime-history-height]": "heightStyle()",
  },
  template: `
    @if (showHeader()) {
      <div class="uptime-history-header">
        <span class="uptime-history-label">{{ label() }}</span>
        <span class="uptime-history-value">{{ headerValue() }}</span>
      </div>
    }
    <div class="uptime-history-bar" role="img" [attr.aria-label]="ariaLabel()">
      @for (segment of historySegments(); track $index) {
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
    @if (resolvedShowLabels()) {
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
        /* Unified with chart visual language */
      }

      .uptime-history-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--viking-space-3);
        min-width: 0;
        padding-bottom: var(--viking-space-half);
      }

      .uptime-history-label {
        font-size: var(--viking-font-size-xs);
        font-weight: var(--viking-font-weight-semibold);
        letter-spacing: var(--viking-letter-spacing-caps);
        text-transform: uppercase;
        color: var(--viking-text-muted);
      }

      .uptime-history-value {
        font-size: var(--viking-font-size-sm);
        font-weight: var(--viking-font-weight-semibold);
        color: var(--viking-text);
        font-variant-numeric: tabular-nums;
        text-align: right;
      }

      .uptime-history-bar {
        display: flex;
        align-items: stretch;
        gap: var(--viking-space-px);
        width: 100%;
        min-width: 0;
        height: var(--viking-uptime-history-height, var(--viking-space-4));
        padding: var(--viking-space-1);
        border-radius: var(--viking-radius-lg);
        background: var(--viking-surface-inset);
        box-sizing: border-box;
        border: 1px solid var(--viking-border-subtle);
      }

      :host(.viking-uptime-history-compact) .uptime-history-bar {
        height: var(--viking-space-3);
        padding: var(--viking-space-half);
        border-radius: var(--viking-radius);
      }

      /* Mobile: ensure minimum segment width for readability */
      @media (max-width: 480px) {
        .uptime-history-bar {
          gap: 1px;
        }
        .uptime-history-segment {
          min-width: 2.5px;
        }
      }

      .uptime-history-bar viking-uptime-bar {
        flex: 1 1 0;
        min-width: 4px;
        border-radius: var(--viking-radius);
      }

      .uptime-history-segment {
        position: relative;
        display: flex;
        flex: 1 1 0;
        min-width: 4px;
        height: 100%;
        border-radius: var(--viking-radius);
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
        bottom: calc(100% + var(--viking-space-2));
        transform: translateX(-50%) translateY(var(--viking-space-1));
        width: max-content;
        max-width: min(18rem, 85vw);
        padding: var(--viking-space-1) var(--viking-space-2);
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius);
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
        gap: var(--viking-space-3);
        font-size: var(--viking-font-size-2xs);
        color: var(--viking-text-subtle);
        padding-top: var(--viking-space-half);
      }
    `,
  ],
})
export class UptimeHistoryComponent {
  readonly data = input<UptimeHistoryDataPoint[]>([]);
  readonly segments = input<VikingUptimeSegment[]>([]);
  readonly height = input<number>(32); /* Flux-style visible breathing on timeline */
  readonly showLabels = input<boolean | undefined>(undefined);
  readonly percentage = input<number | null>(null);
  readonly statusSummary = input<string>("");
  readonly label = input<string>("Uptime");
  readonly showHeader = input<boolean>(true);
  readonly showLegend = input<boolean>(true);
  readonly legendStart = input<string>("30 days ago");
  readonly legendEnd = input<string>("Today");
  readonly compact = input<boolean>(false);

  readonly heightStyle = computed(() => `${Math.max(this.height(), 1)}px`);

  readonly historySegments = computed<VikingUptimeSegment[]>(() => {
    const data = this.data();
    if (data.length > 0) {
      return data.map((item) => ({
        date: item.date,
        status: item.status,
      }));
    }
    return this.segments();
  });

  readonly resolvedShowLabels = computed(
    () => this.showLabels() ?? this.showLegend(),
  );

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
    const count = this.historySegments().length;
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
