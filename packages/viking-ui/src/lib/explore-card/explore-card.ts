import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import { VikingBadge } from "../badge/badge";
import { VikingButton } from "../button/button";
import { VikingIcon } from "../icon/icon";
import { StatusBadgeComponent } from "../status-badge/status-badge";
import { VikingStatusCard } from "../status-card/status-card";
import {
  UptimeHistoryComponent,
  type UptimeHistoryDataPoint,
  type VikingUptimeSegment,
} from "../uptime-history/uptime-history";
import type { VikingIconName } from "../../core/icons";
import type { VikingTone } from "../../core/types";

export type ExploreCardStatus =
  | "operational"
  | "degraded"
  | "outage"
  | "maintenance"
  | string;

export type ExploreCardMetric = {
  icon: VikingIconName | string;
  label: string;
  value: string | number;
  sublabel?: string;
  tone?: VikingTone | "default";
};

export type ExploreCardUptimePoint = UptimeHistoryDataPoint;

export type ExploreCardData = {
  title: string;
  description: string;
  href: string;
  status?: ExploreCardStatus;
  statusLabel?: string;
  proVerified?: boolean;
  metrics: ExploreCardMetric[];
  uptimeHistory: ExploreCardUptimePoint[];
  uptimePercentage?: number | null;
  uptimeSummary?: string;
};

const normalizeStatusTone = (status: string): VikingTone => {
  const value = status.trim().toLowerCase().replace(/\s+/g, "_");
  if (value === "operational" || value === "up") return "success";
  if (value === "degraded" || value === "partial_outage") return "warning";
  if (value === "maintenance") return "warning";
  if (value === "outage" || value === "major_outage" || value === "down")
    return "danger";
  return "muted";
};

const normalizeStatusLabel = (status: string): string => {
  const value = status.trim().toLowerCase().replace(/\s+/g, "_");
  if (value === "operational" || value === "up") return "Operational";
  if (value === "degraded" || value === "partial_outage") return "Degraded";
  if (value === "maintenance") return "Maintenance";
  if (value === "outage" || value === "major_outage" || value === "down")
    return "Outage";
  return status || "Operational";
};

const segmentToDataPoint = (
  segment: VikingUptimeSegment,
  index: number,
): ExploreCardUptimePoint => {
  const status = `${segment.status}`.toLowerCase().replace(/\s+/g, "_");
  const date = new Date("2026-06-08T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + index);
  return {
    date: segment.date ?? date.toISOString().slice(0, 10),
    status:
      status === "outage" || status === "major_outage" || status === "down"
        ? "down"
        : status === "degraded" ||
            status === "partial" ||
            status === "partial_outage"
          ? "partial"
          : "up",
  };
};

/**
 * ExploreCardMetricItemComponent — reusable compact metric for public status cards.
 *
 * @example
 * ```html
 * <viking-explore-card-metric
 *   icon="server"
 *   label="Cumulative SLA"
 *   value="100.00%"
 *   sublabel="Based on real telemetry"
 * />
 * ```
 */
@Component({
  selector: "viking-explore-card-metric",
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[class]": "hostClass()",
    "[attr.aria-label]": "ariaLabel()",
  },
  template: `
    <div class="viking-explore-card-metric-copy">
      <viking-icon
        [name]="icon()"
        [size]="18"
        [color]="iconColor()"
        [backdrop]="true"
        [backdropTone]="backdropTone()"
      />
      <span class="viking-explore-card-metric-label-group">
        <span class="viking-explore-card-metric-label">{{ label() }}</span>
        @if (sublabel()) {
          <span class="viking-explore-card-metric-sublabel">
            {{ sublabel() }}
          </span>
        }
      </span>
    </div>
    <strong class="viking-explore-card-metric-value">{{ value() }}</strong>
  `,
  styles: [
    `
      :host {
        display: grid;
        grid-template-columns: minmax(0, 1fr) max-content;
        align-items: center;
        gap: var(--viking-space-2);
        min-width: 0;
        min-height: var(--viking-touch-target-comfort);
        padding: var(--viking-space-1-5);
        border-radius: var(--viking-radius-sm);
        background: color-mix(
          in srgb,
          var(--viking-surface-alt) 78%,
          var(--viking-surface)
        );
        color: var(--viking-text);
        box-sizing: border-box;
        transition: var(--viking-transition-interactive);
      }

      :host(:hover) {
        background: color-mix(
          in srgb,
          var(--viking-surface-alt) 92%,
          var(--viking-surface)
        );
      }

      .viking-explore-card-metric-copy {
        display: flex;
        align-items: center;
        gap: var(--viking-space-1-5);
        min-width: 0;
      }

      .viking-explore-card-metric-label-group {
        display: grid;
        gap: var(--viking-space-px);
        min-width: 0;
      }

      .viking-explore-card-metric-label {
        display: block;
        color: var(--viking-text-muted);
        font-size: var(--viking-font-size-2xs);
        font-weight: var(--viking-font-weight-semibold);
        letter-spacing: var(--viking-letter-spacing-caps);
        line-height: var(--viking-line-height-snug);
        text-transform: uppercase;
      }

      .viking-explore-card-metric-sublabel {
        display: block;
        color: var(--viking-text-subtle);
        font-size: var(--viking-font-size-3xs);
        line-height: var(--viking-line-height-snug);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .viking-explore-card-metric-value {
        color: var(--viking-accent-strong);
        font-size: var(--viking-font-size-sm);
        font-weight: var(--viking-font-weight-bold);
        font-variant-numeric: tabular-nums;
        line-height: var(--viking-line-height-tight);
        overflow-wrap: anywhere;
        text-align: right;
      }

      :host(.viking-explore-card-metric-success)
        .viking-explore-card-metric-value {
        color: var(--viking-success);
      }

      :host(.viking-explore-card-metric-warning)
        .viking-explore-card-metric-value {
        color: var(--viking-warning);
      }

      :host(.viking-explore-card-metric-danger)
        .viking-explore-card-metric-value {
        color: var(--viking-danger-text);
      }

      :host(.viking-explore-card-metric-info)
        .viking-explore-card-metric-value {
        color: var(--viking-info);
      }
    `,
  ],
})
export class ExploreCardMetricItemComponent {
  readonly icon = input.required<VikingIconName | string>();
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly sublabel = input<string>("");
  readonly tone = input<VikingTone | "default">("default");

  protected readonly resolvedTone = computed(() =>
    this.tone() === "default" ? "accent" : this.tone(),
  );

  protected readonly iconColor = computed(() =>
    this.tone() === "default" ? "accent" : this.tone(),
  );

  protected readonly backdropTone = computed(() => {
    const tone = this.resolvedTone();
    return tone === "danger" || tone === "warning" || tone === "success"
      ? tone
      : "info";
  });

  protected readonly hostClass = computed(() => ({
    "viking-explore-card-metric": true,
    [`viking-explore-card-metric-${this.tone()}`]: this.tone() !== "default",
  }));

  protected readonly ariaLabel = computed(() => {
    const sublabel = this.sublabel();
    return [this.label(), this.value(), sublabel].filter(Boolean).join(": ");
  });
}

/**
 * ExploreCardComponent — public status directory card.
 *
 * @example
 * ```html
 * <viking-explore-card
 *   title="Data Engineering for Machine Learning"
 *   description="Real-time platform status for DEML services."
 *   href="/status/platform-status"
 *   [proVerified]="true"
 *   status="operational"
 *   [metrics]="metrics"
 *   [uptimeHistory]="uptime"
 * />
 * ```
 */
@Component({
  selector: "viking-explore-card",
  imports: [
    ExploreCardMetricItemComponent,
    StatusBadgeComponent,
    UptimeHistoryComponent,
    VikingBadge,
    VikingButton,
    VikingStatusCard,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: "viking-explore-card",
    "[class.viking-explore-card-interactive]": "!!href()",
  },
  template: `
    <viking-status-card
      [title]="title()"
      [subtitle]="description()"
      [status]="resolvedStatusLabel()"
      [statusTone]="statusTone()"
      [statusDot]="true"
      [compact]="true"
      [interactive]="!!href()"
      [ariaLabel]="ariaLabel()"
    >
      <div class="viking-explore-card-badges" aria-label="Status badges">
        @if (proVerified()) {
          <viking-badge
            tone="accent"
            icon="check-circle"
            title="Pro subscriber — verified status page"
            aria-label="Pro verified status page"
          >
            Pro Verified
          </viking-badge>
        }
        <viking-status-badge
          [variant]="status()"
          [label]="resolvedStatusLabel()"
        />
      </div>

      <div class="viking-explore-card-metrics">
        @for (metric of metrics(); track metric.label) {
          <viking-explore-card-metric
            [icon]="metric.icon"
            [label]="metric.label"
            [value]="metric.value"
            [sublabel]="metric.sublabel ?? ''"
            [tone]="metric.tone ?? 'default'"
          />
        }
      </div>

      <viking-uptime-history
        [data]="resolvedUptimeHistory()"
        [height]="16"
        [showLabels]="false"
        [percentage]="uptimePercentage()"
        [statusSummary]="uptimeSummary() || resolvedStatusLabel()"
        [compact]="true"
        label="Uptime"
      />

      @if (href()) {
        <div class="viking-explore-card-footer">
          <viking-button
            variant="primary"
            [fullWidth]="true"
            [href]="href()"
            iconTrailing="arrow-right"
          >
            {{ viewLabel() }}
          </viking-button>
        </div>
      }
    </viking-status-card>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        min-width: 0;
        border-radius: var(--viking-radius-lg);
        transition: var(--viking-transition-interactive);
      }

      :host(.viking-explore-card-interactive:hover) {
        transform: translateY(calc(var(--viking-state-hover-lift) * -1));
      }

      .viking-explore-card-badges,
      .viking-explore-card-footer {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--viking-space-2);
        min-width: 0;
      }

      .viking-explore-card-badges {
        justify-content: space-between;
        padding-top: var(--viking-space-2);
        margin-top: var(--viking-space-1);
        border-top: 1px solid var(--viking-border-subtle);
      }

      .viking-explore-card-metrics {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: var(--viking-space-2);
        width: 100%;
        min-width: 0;
      }

      .viking-explore-card-footer {
        padding-top: var(--viking-space-3);
        border-top: 1px solid var(--viking-border-subtle);
      }

      @media (min-width: 640px) {
        .viking-explore-card-metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `,
  ],
})
export class ExploreCardComponent {
  readonly title = input.required<string>();
  readonly description = input<string>("Monitoring core services");
  readonly href = input<string>("");
  readonly proVerified = input<boolean>(false);
  readonly status = input<ExploreCardStatus>("operational");
  readonly statusLabel = input<string>("");
  readonly metrics = input<ExploreCardMetric[]>([]);
  readonly uptimeHistory = input<ExploreCardUptimePoint[]>([]);
  readonly segments = input<VikingUptimeSegment[]>([]);
  readonly uptimePercentage = input<number | null>(null);
  readonly uptimeSummary = input<string>("");
  readonly viewLabel = input<string>("View Dedicated Page");

  protected readonly resolvedStatusLabel = computed(
    () => this.statusLabel() || normalizeStatusLabel(this.status()),
  );

  protected readonly statusTone = computed(() =>
    normalizeStatusTone(this.status()),
  );

  protected readonly resolvedUptimeHistory = computed(() => {
    const data = this.uptimeHistory();
    if (data.length > 0) return data;
    return this.segments().map(segmentToDataPoint);
  });

  protected readonly ariaLabel = computed(
    () => `${this.title()} public status card: ${this.resolvedStatusLabel()}`,
  );
}

export { ExploreCardComponent as VikingExploreCard };
