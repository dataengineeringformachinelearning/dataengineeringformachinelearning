import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";

export type VikingUptimeStatus =
  | "operational"
  | "partial_outage"
  | "major_outage"
  | "no_data";

/** viking-uptime-bar — timeline bar for uptime history visualizations. */
@Component({
  selector: "viking-uptime-bar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: "viking-uptime-bar",
    "[class.viking-uptime-partial]": "status() === 'partial_outage'",
    "[class.viking-uptime-major]": "status() === 'major_outage'",
    "[class.viking-uptime-nodata]": "status() === 'no_data'",
    "[attr.title]": "title()",
    "[attr.aria-label]": "title() || null",
  },
  template: "",
  styles: [
    `
      :host {
        display: block;
        flex: 1 1 0;
        min-width: 3px;
        width: 100%;
        height: 100%;
        border-radius: var(--viking-radius-pill);
        background: var(--viking-success);
        align-self: stretch;
      }
      :host(.viking-uptime-partial) {
        height: 70%;
        align-self: flex-end;
        background: var(--viking-warning);
      }
      :host(.viking-uptime-major) {
        height: 40%;
        align-self: flex-end;
        background: var(--viking-danger);
      }
      :host(.viking-uptime-nodata) {
        background: var(--viking-text-muted);
        opacity: 0.35;
      }
    `,
  ],
})
export class VikingUptimeBar {
  readonly status = input<VikingUptimeStatus>("operational");
  readonly title = input<string>("");
}
