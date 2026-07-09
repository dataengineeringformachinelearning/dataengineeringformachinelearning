import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";

export type VikingPageMockupVariant =
  | "security-ops"
  | "analytics"
  | "dashboard"
  | "status"
  | "explore";

export type VikingPageMockupGauge = {
  label: string;
  value: string;
  primary?: boolean;
};

export type VikingPageMockupStat = {
  label: string;
  value: string;
};

const VARIANT_DEFAULTS: Record<
  VikingPageMockupVariant,
  {
    title: string;
    gauges: VikingPageMockupGauge[];
    stats: VikingPageMockupStat[];
    bars: number[];
    chartMode: "bars" | "line";
  }
> = {
  "security-ops": {
    title: "deml.app / security-ops",
    gauges: [
      { label: "Threat", value: "12%" },
      { label: "CES", value: "94", primary: true },
      { label: "Stability", value: "99%" },
    ],
    stats: [
      { label: "P99", value: "42ms" },
      { label: "Requests", value: "12.4K" },
      { label: "Incidents", value: "0" },
    ],
    bars: [45, 72, 58, 85, 63, 91, 78, 55],
    chartMode: "bars",
  },
  analytics: {
    title: "deml.app / analytics",
    gauges: [
      { label: "Latency", value: "38ms" },
      { label: "Throughput", value: "8.2K", primary: true },
      { label: "Uptime", value: "99.9%" },
    ],
    stats: [
      { label: "P99", value: "61ms" },
      { label: "Regions", value: "14" },
      { label: "Anomalies", value: "2" },
    ],
    bars: [38, 55, 48, 70, 62, 88, 74, 66],
    chartMode: "line",
  },
  dashboard: {
    title: "deml.app / dashboard",
    gauges: [
      { label: "Health", value: "96" },
      { label: "Score", value: "88", primary: true },
      { label: "SLA", value: "99.7%" },
    ],
    stats: [
      { label: "Open", value: "3" },
      { label: "Visitors", value: "1.1K" },
      { label: "Forecast", value: "82%" },
    ],
    bars: [50, 64, 52, 78, 69, 84, 71, 60],
    chartMode: "bars",
  },
  status: {
    title: "deml.app / platform-status",
    gauges: [
      { label: "API", value: "OK" },
      { label: "Ingest", value: "OK", primary: true },
      { label: "ML", value: "OK" },
    ],
    stats: [
      { label: "SLA", value: "99.99%" },
      { label: "Latency", value: "158ms" },
      { label: "Services", value: "12" },
    ],
    bars: [80, 82, 79, 88, 90, 86, 91, 89],
    chartMode: "line",
  },
  explore: {
    title: "deml.app / explore",
    gauges: [
      { label: "Public", value: "48" },
      { label: "Verified", value: "19", primary: true },
      { label: "Live", value: "31" },
    ],
    stats: [
      { label: "Pages", value: "48" },
      { label: "Pro", value: "19" },
      { label: "Views", value: "6.3K" },
    ],
    bars: [42, 58, 49, 66, 54, 73, 61, 57],
    chartMode: "bars",
  },
};

/**
 * viking-page-mockup — angled product window mock for heroes and empty states.
 * Overflows slightly so the 3D transform never clips on the trailing edge.
 */
@Component({
  selector: "viking-page-mockup",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: "viking-page-mockup hero-mockup",
    "[attr.aria-hidden]": "decorative() ? 'true' : null",
    "[attr.aria-label]": "decorative() ? null : resolvedTitle()",
  },
  template: `
    <div class="viking-page-mockup-window mockup-window">
      <div class="viking-page-mockup-titlebar mockup-titlebar">
        <span class="viking-page-mockup-dot mockup-dot"></span>
        <span class="viking-page-mockup-dot mockup-dot"></span>
        <span class="viking-page-mockup-dot mockup-dot"></span>
        <span class="viking-page-mockup-title mockup-title">{{
          resolvedTitle()
        }}</span>
      </div>
      <div class="viking-page-mockup-body mockup-body">
        <div
          class="viking-page-mockup-sidebar mockup-sidebar"
          aria-hidden="true"
        >
          <span
            class="viking-page-mockup-nav-item mockup-nav-item active"
          ></span>
          <span class="viking-page-mockup-nav-item mockup-nav-item"></span>
          <span class="viking-page-mockup-nav-item mockup-nav-item"></span>
        </div>
        <div class="viking-page-mockup-main mockup-main">
          <div class="viking-page-mockup-gauges mockup-gauges">
            @for (gauge of resolvedGauges(); track gauge.label) {
              <div
                class="viking-page-mockup-gauge mockup-gauge"
                [class.primary]="!!gauge.primary"
              >
                <span class="viking-page-mockup-gauge-label gauge-label">{{
                  gauge.label
                }}</span>
                <span class="viking-page-mockup-gauge-val gauge-val">{{
                  gauge.value
                }}</span>
              </div>
            }
          </div>
          <div
            class="viking-page-mockup-chart mockup-chart"
            [class.is-line]="resolvedChartMode() === 'line'"
            aria-hidden="true"
          >
            @for (height of resolvedBars(); track $index) {
              <div
                class="viking-page-mockup-bar chart-bar"
                [attr.data-height]="height"
              ></div>
            }
          </div>
          <div class="viking-page-mockup-stats mockup-stats-row">
            @for (stat of resolvedStats(); track stat.label) {
              <div class="viking-page-mockup-stat mockup-stat">
                <span>{{ stat.label }}</span>
                <strong>{{ stat.value }}</strong>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
    `,
  ],
})
export class VikingPageMockup {
  readonly variant = input<VikingPageMockupVariant>("security-ops");
  readonly title = input<string>("");
  readonly gauges = input<VikingPageMockupGauge[] | null>(null);
  readonly stats = input<VikingPageMockupStat[] | null>(null);
  readonly bars = input<number[] | null>(null);
  readonly chartMode = input<"bars" | "line" | null>(null);
  readonly decorative = input<boolean>(true);

  private readonly defaults = computed(
    () => VARIANT_DEFAULTS[this.variant()] ?? VARIANT_DEFAULTS["security-ops"],
  );

  protected readonly resolvedTitle = computed(
    () => this.title() || this.defaults().title,
  );
  protected readonly resolvedGauges = computed(
    () => this.gauges() ?? this.defaults().gauges,
  );
  protected readonly resolvedStats = computed(
    () => this.stats() ?? this.defaults().stats,
  );
  protected readonly resolvedBars = computed(
    () => this.bars() ?? this.defaults().bars,
  );
  protected readonly resolvedChartMode = computed(
    () => this.chartMode() ?? this.defaults().chartMode,
  );
}
