import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import { VikingIcon } from "../icon/icon";

export type VikingChartContainerVariant = "default" | "subtle" | "gradient";

/**
 * viking-chart-container — wrapper for consistent inlaid chart presentation.
 * Inspired by Ghost analytics cards and Cloudscape Container pattern.
 * Ensures perfect padding, responsive sizing, and subtle background framing.
 */
@Component({
  selector: "viking-chart-container",
  standalone: true,
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[class]": "hostClass()",
  },
  template: `
    <div class="viking-chart-container">
      @if (heading()) {
        <header class="viking-chart-container__header">
          <h2 class="viking-chart-container__heading">{{ heading() }}</h2>
          @if (description()) {
            <p class="viking-chart-container__description">
              {{ description() }}
            </p>
          }
          @if (infoTooltip()) {
            <div class="viking-chart-container__tooltip">
              <viking-icon name="info" [size]="16" [title]="infoTooltip()" />
            </div>
          }
        </header>
      }
      <div class="viking-chart-container__plot">
        <ng-content />
      </div>
      @if (legendPosition()) {
        <footer
          class="viking-chart-container__legend viking-chart-container__legend--{{
            legendPosition()
          }}"
        ></footer>
      }
    </div>
  `,
  styles: [
    `
      :host(.viking-chart-container-wrapper) {
        display: block;
        width: 100%;
        max-width: 100%;
      }
      .viking-chart-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        border: 1px solid var(--viking-border-subtle);
        border-radius: var(--viking-radius-xl);
        background: var(
          --viking-chart-container-bg,
          var(--viking-surface-card)
        );
        overflow: hidden;
      }
      .viking-chart-container__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--viking-space-2);
        padding: var(--viking-chart-container-padding, var(--viking-space-3));
        border-bottom: 1px solid var(--viking-border-subtle);
      }
      .viking-chart-container__heading {
        margin: 0;
        font-size: var(--viking-font-size-ui);
        font-weight: var(--viking-font-weight-bold);
        letter-spacing: var(--viking-letter-spacing-tight);
        color: var(--viking-text);
      }
      .viking-chart-container__description {
        margin: var(--viking-space-0-5) 0 0;
        font-size: var(--viking-font-size-sm);
        color: var(--viking-text-muted);
      }
      .viking-chart-container__tooltip {
        color: var(--viking-text-muted);
        cursor: help;
      }
      .viking-chart-container__plot {
        flex: 1;
        width: 100%;
        min-height: 0;
        padding: var(
          --viking-chart-container-plot-padding,
          var(--viking-space-2)
        );
        background: var(--viking-chart-container-plot-bg, transparent);
      }
      .viking-chart-container__legend {
        padding: var(--viking-space-2) var(--viking-space-3)
          var(--viking-space-3);
        font-size: var(--viking-font-size-xs);
        color: var(--viking-text-muted);
      }
      .viking-chart-container__legend--bottom {
        border-top: 1px solid var(--viking-border-subtle);
      }
      /* Variant styles */
      .viking-chart-container--subtle {
        --viking-chart-container-bg: color-mix(
          in srgb,
          var(--viking-accent) 4%,
          transparent
        );
        --viking-chart-container-plot-bg: transparent;
      }
      .viking-chart-container--gradient {
        --viking-chart-container-bg: linear-gradient(
          180deg,
          color-mix(in srgb, var(--viking-accent) 6%, transparent) 0%,
          transparent 100%
        );
        --viking-chart-container-plot-bg: transparent;
      }
      /* Responsive sizing */
      :host(.viking-chart-container-auto) .viking-chart-container {
        aspect-ratio: var(--viking-chart-container-ratio, 16 / 9);
        max-height: var(--viking-chart-container-max-height, 500px);
      }
      :host(.viking-chart-container-time-series) .viking-chart-container {
        aspect-ratio: 3 / 1;
        max-height: 240px;
      }
      :host(.viking-chart-container-full) .viking-chart-container {
        aspect-ratio: var(--viking-chart-container-full-ratio, auto);
        min-height: 20rem;
      }
    `,
  ],
})
export class VikingChartContainer {
  readonly heading = input<string>("");
  readonly description = input<string>("");
  readonly infoTooltip = input<string>("");
  readonly variant = input<VikingChartContainerVariant>("default");
  readonly legendPosition = input<"bottom" | "side" | "">("bottom");

  protected readonly hostClass = computed(() =>
    [
      "viking-chart-container-wrapper",
      `viking-chart-container--${this.variant()}`,
      this.heading() ? "viking-chart-container-has-header" : "",
    ].join(" "),
  );
}
