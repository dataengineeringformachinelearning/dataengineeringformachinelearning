import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import {
  AnnouncementCardComponent,
  type AnnouncementCardTone,
} from "../announcement-card/announcement-card";
import { MetricCardComponent } from "../metric-card/metric-card";
import {
  StatusBadgeComponent,
  type StatusBadgeVariant,
} from "../status-badge/status-badge";
import { StatusSectionComponent } from "../status-section/status-section";
import {
  UptimeHistoryComponent,
  type UptimeHistoryDataPoint,
} from "../uptime-history/uptime-history";
import { VikingCallout } from "../callout/callout";
import type { VikingIconName } from "../../core/icons";
import type { VikingTone } from "../../core/types";

export type StatusDashboardThemeMode = "current" | "light" | "dark";

export type StatusDashboardMetric = {
  icon?: VikingIconName | string | null;
  label: string;
  value: string | number;
  sublabel?: string;
  tone?: VikingTone | "default";
};

export type StatusDashboardService = {
  name: string;
  url?: string;
  status?: StatusBadgeVariant | string;
  statusLabel?: string;
  latency?: string | number;
  uptime?: string | number;
  history: UptimeHistoryDataPoint[];
};

export type StatusDashboardAnnouncement = {
  title: string;
  body: string;
  tone?: AnnouncementCardTone;
  publishedAt?: string | Date | null;
};

const createDemoHistory = (
  partialIndex: number,
  downIndex: number,
): UptimeHistoryDataPoint[] =>
  Array.from({ length: 30 }, (_, index) => {
    const date = new Date("2026-06-08T00:00:00Z");
    date.setUTCDate(date.getUTCDate() + index);
    return {
      date: date.toISOString().slice(0, 10),
      status:
        index === downIndex
          ? "down"
          : index === partialIndex
            ? "partial"
            : "up",
    };
  });

const DEMO_HISTORY_PRIMARY = createDemoHistory(12, 21);
const DEMO_HISTORY_API = createDemoHistory(7, 22);
const DEMO_HISTORY_CDN = createDemoHistory(18, -1);

const DEMO_METRICS: StatusDashboardMetric[] = [
  {
    icon: "server",
    label: "SLA",
    value: "99.99%",
    sublabel: "30-day service level",
    tone: "success",
  },
  {
    icon: "clock",
    label: "Latency",
    value: "158.71ms",
    sublabel: "Latest observation",
    tone: "info",
  },
  {
    icon: "bar-chart",
    label: "Requests",
    value: "2.4M",
    sublabel: "Last 24 hours",
    tone: "default",
  },
  {
    icon: "trending-up",
    label: "Forecast",
    value: "100.00%",
    sublabel: "Predicted SLA",
    tone: "default",
  },
];

const DEMO_SERVICES: StatusDashboardService[] = [
  {
    name: "Primary Site",
    url: "https://joealongi.dev",
    status: "operational",
    statusLabel: "Operational",
    latency: "158.71ms",
    uptime: "100.00%",
    history: DEMO_HISTORY_PRIMARY,
  },
  {
    name: "API Gateway",
    url: "https://api.deml.app",
    status: "degraded",
    statusLabel: "Partial",
    latency: "212.08ms",
    uptime: "99.94%",
    history: DEMO_HISTORY_API,
  },
  {
    name: "Edge Announcements",
    url: "Sanity.io CDN",
    status: "operational",
    statusLabel: "Operational",
    latency: "42.13ms",
    uptime: "100.00%",
    history: DEMO_HISTORY_CDN,
  },
];

const DEMO_ANNOUNCEMENTS: StatusDashboardAnnouncement[] = [
  {
    tone: "info",
    title: "Sanity.io Integration Active",
    publishedAt: "2026-06-13",
    body: "Announcements are served globally from edge CDNs for lightning-fast status page updates.",
  },
  {
    tone: "warning",
    title: "API Gateway Latency Watch",
    publishedAt: "2026-06-20",
    body: "The prediction worker detected elevated latency and is tracking the gateway under a degraded watch.",
  },
];

/**
 * StatusDashboardComponent — cohesive status monitoring dashboard section.
 *
 * Composes StatusBadgeComponent, MetricCardComponent, UptimeHistoryComponent,
 * and AnnouncementCardComponent into one full-width status page surface.
 *
 * @example
 * ```html
 * <viking-status-dashboard
 *   title="Operational — joealongi"
 *   description="All systems are functioning normally."
 *   status="operational"
 *   statusLabel="Operational"
 *   liveLabel="Live Predictions Active"
 *   [metrics]="metrics"
 *   [services]="services"
 *   [announcements]="announcements"
 *   [showThemeVersions]="true"
 * />
 * ```
 */
@Component({
  selector: "viking-status-dashboard",
  imports: [
    AnnouncementCardComponent,
    MetricCardComponent,
    StatusBadgeComponent,
    StatusSectionComponent,
    UptimeHistoryComponent,
    VikingCallout,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: "viking-status-dashboard",
  },
  template: `
    <div class="viking-status-dashboard-versions">
      @for (mode of visibleThemeModes(); track mode) {
        <section
          class="viking-status-dashboard-theme"
          [class.viking-status-dashboard-theme-current]="mode === 'current'"
          [class.viking-status-dashboard-theme-light]="mode === 'light'"
          [class.viking-status-dashboard-theme-dark]="mode === 'dark'"
          [attr.aria-label]="themeAriaLabel(mode)"
        >
          @if (mode !== "current") {
            <p class="viking-status-dashboard-theme-label">
              {{ themeLabel(mode) }}
            </p>
          }

          <viking-status-section
            [title]="title()"
            [description]="description()"
            [status]="status()"
            [statusLabel]="statusLabel()"
            [liveLabel]="liveLabel()"
          >
            <section
              class="viking-status-section-block"
              [attr.aria-labelledby]="
                'status-dashboard-metrics-heading-' + mode
              "
            >
              <h3
                class="viking-status-section-heading"
                [attr.id]="'status-dashboard-metrics-heading-' + mode"
              >
                {{ metricsHeading() }}
              </h3>
              <div class="viking-status-section-metrics">
                @for (metric of metrics(); track metric.label) {
                  <viking-metric-card
                    [icon]="metric.icon ?? null"
                    [label]="metric.label"
                    [value]="metric.value"
                    [sublabel]="metric.sublabel ?? ''"
                    [tone]="metric.tone ?? 'default'"
                  />
                }
              </div>
            </section>

            <section
              class="viking-status-section-block"
              [attr.aria-labelledby]="
                'status-dashboard-services-heading-' + mode
              "
            >
              <h3
                class="viking-status-section-heading"
                [attr.id]="'status-dashboard-services-heading-' + mode"
              >
                {{ servicesHeading() }}
              </h3>

              @if (services().length === 0) {
                <viking-callout tone="muted" heading="No Services">
                  No monitored services configured for this status page.
                </viking-callout>
              } @else {
                <div class="viking-status-service-list">
                  @for (service of services(); track service.name) {
                    <article class="viking-status-service">
                      <div class="viking-status-section-row">
                        <div>
                          <h4 class="viking-status-section-heading">
                            {{ service.name }}
                          </h4>
                          @if (service.url) {
                            <p class="viking-status-section-subtitle">
                              {{ service.url }}
                            </p>
                          }
                        </div>
                        <viking-status-badge
                          [variant]="service.status ?? 'operational'"
                          [label]="
                            service.statusLabel ?? serviceStatusLabel(service)
                          "
                        />
                      </div>

                      <div class="viking-status-section-grid">
                        <viking-metric-card
                          icon="clock"
                          label="Response Time"
                          [value]="service.latency ?? 'Pending'"
                          sublabel="Latest observation"
                          tone="info"
                        />
                        <viking-metric-card
                          icon="shield-check"
                          label="Uptime"
                          [value]="service.uptime ?? '100.00%'"
                          sublabel="30-day SLA"
                          tone="success"
                        />
                      </div>

                      <viking-uptime-history
                        [data]="service.history"
                        [height]="24"
                        [showLabels]="true"
                        label="Uptime"
                        [statusSummary]="
                          service.uptime
                            ? service.uptime + ' SLA'
                            : '30-day SLA'
                        "
                      />
                    </article>
                  }
                </div>
              }
            </section>

            <section
              class="viking-status-section-block"
              [attr.aria-labelledby]="
                'status-dashboard-announcements-heading-' + mode
              "
            >
              <h3
                class="viking-status-section-heading"
                [attr.id]="'status-dashboard-announcements-heading-' + mode"
              >
                {{ announcementsHeading() }}
              </h3>
              @for (announcement of announcements(); track announcement.title) {
                <viking-announcement-card
                  [tone]="announcement.tone ?? 'info'"
                  [title]="announcement.title"
                  [publishedAt]="announcement.publishedAt ?? null"
                >
                  {{ announcement.body }}
                </viking-announcement-card>
              }
            </section>
          </viking-status-section>
        </section>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        min-width: 0;
      }

      .viking-status-dashboard-versions {
        display: grid;
        gap: var(--viking-space-4);
        width: 100%;
        min-width: 0;
      }

      .viking-status-dashboard-theme {
        display: grid;
        gap: var(--viking-space-2);
        width: 100%;
        min-width: 0;
        color: var(--viking-text);
      }

      .viking-status-dashboard-theme-light,
      .viking-status-dashboard-theme-dark {
        padding: var(--viking-space-3);
        border-radius: var(--viking-radius-lg);
        background: var(--viking-bg);
      }

      .viking-status-dashboard-theme-label {
        margin: 0;
        color: var(--viking-text-muted);
        font-size: var(--viking-font-size-xs);
        font-weight: var(--viking-font-weight-semibold);
        letter-spacing: var(--viking-letter-spacing-caps);
        line-height: var(--viking-line-height-snug);
        text-transform: uppercase;
      }

      .viking-status-dashboard-theme-dark {
        color-scheme: dark;
        --viking-bg: var(--viking-charcoal-900);
        --viking-surface: var(--viking-charcoal-800);
        --viking-surface-alt: var(--viking-charcoal-700);
        --viking-surface-inset: var(--viking-charcoal-950);
        --viking-surface-raised: var(--viking-charcoal-600);
        --viking-text: var(--viking-white);
        --viking-text-muted: var(--viking-metallic-200);
        --viking-text-subtle: var(--viking-metallic-300);
        --viking-border: color-mix(
          in srgb,
          var(--viking-metallic-600) 48%,
          transparent
        );
        --viking-border-strong: color-mix(
          in srgb,
          var(--viking-metallic-400) 68%,
          transparent
        );
        --viking-border-subtle: color-mix(
          in srgb,
          var(--viking-metallic-600) 28%,
          transparent
        );
        --viking-accent: var(--viking-electric-500);
        --viking-accent-strong: var(--viking-electric-300);
        --viking-success: var(--viking-green-500);
        --viking-warning: var(--viking-gold-500);
        --viking-danger: var(--viking-crimson-500);
        --viking-info: var(--viking-blue-500);
        --viking-danger-text: var(--viking-crimson-400);
      }

      .viking-status-dashboard-theme-light {
        color-scheme: light;
        --viking-bg: var(--viking-slate-050);
        --viking-surface: var(--viking-white-pure);
        --viking-surface-alt: var(--viking-slate-100);
        --viking-surface-inset: var(--viking-metallic-050);
        --viking-surface-raised: var(--viking-white-pure);
        --viking-text: var(--viking-charcoal-900);
        --viking-text-muted: var(--viking-metallic-500);
        --viking-text-subtle: var(--viking-metallic-400);
        --viking-border: color-mix(
          in srgb,
          var(--viking-metallic-600) 32%,
          transparent
        );
        --viking-border-strong: color-mix(
          in srgb,
          var(--viking-metallic-600) 48%,
          transparent
        );
        --viking-border-subtle: color-mix(
          in srgb,
          var(--viking-metallic-600) 22%,
          transparent
        );
        --viking-accent: var(--viking-electric-600);
        --viking-accent-strong: var(--viking-electric-400);
        --viking-success: var(--viking-green-500);
        --viking-warning: var(--viking-gold-500);
        --viking-danger: var(--viking-crimson-600);
        --viking-info: var(--viking-electric-600);
        --viking-danger-text: var(--viking-crimson-700);
      }
    `,
  ],
})
export class StatusDashboardComponent {
  readonly title = input<string>("Operational — joealongi");
  readonly description = input<string>("All systems are functioning normally.");
  readonly status = input<StatusBadgeVariant | string>("operational");
  readonly statusLabel = input<string>("Operational");
  readonly liveLabel = input<string>("Live Predictions Active");
  readonly metricsHeading = input<string>("System Metrics");
  readonly servicesHeading = input<string>("Active Monitored Services");
  readonly announcementsHeading = input<string>("Latest System Announcements");
  readonly metrics = input<StatusDashboardMetric[]>(DEMO_METRICS);
  readonly services = input<StatusDashboardService[]>(DEMO_SERVICES);
  readonly announcements =
    input<StatusDashboardAnnouncement[]>(DEMO_ANNOUNCEMENTS);
  readonly theme = input<StatusDashboardThemeMode>("current");
  readonly showThemeVersions = input<boolean>(false);

  protected readonly visibleThemeModes = computed<StatusDashboardThemeMode[]>(
    () => (this.showThemeVersions() ? ["light", "dark"] : [this.theme()]),
  );

  protected readonly serviceStatusLabel = (
    service: StatusDashboardService,
  ): string => {
    const raw = `${service.status ?? "operational"}`.toLowerCase();
    if (raw === "degraded" || raw === "partial_outage") return "Partial";
    if (raw === "outage" || raw === "major_outage") return "Down";
    if (raw === "maintenance") return "Maintenance";
    return "Operational";
  };

  protected readonly themeLabel = (mode: StatusDashboardThemeMode): string => {
    if (mode === "light") return "Light mode";
    if (mode === "dark") return "Dark mode";
    return "Current theme";
  };

  protected readonly themeAriaLabel = (
    mode: StatusDashboardThemeMode,
  ): string => `${this.themeLabel(mode)} status dashboard preview`;
}

export { StatusDashboardComponent as VikingStatusDashboard };
