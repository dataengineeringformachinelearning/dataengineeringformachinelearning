import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";

export type VikingChartPanelSize = "large" | "medium";
export type VikingChartPanelBody = "default" | "origin-map";

/** Optional loading flag — when true renders a skeleton in body for chart content. */

/**
 * viking-chart-panel — outlined analytics card shell with consistent header/body rhythm.
 */
@Component({
  selector: "viking-chart-panel",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: "status-card-outlined viking-chart-panel",
    "[class.viking-chart-panel-large]": "size() === 'large'",
    "[class.viking-chart-panel-medium]": "size() === 'medium'",
    "[class.viking-chart-panel-origin-map]": "body() === 'origin-map'",
    "[class.viking-chart-panel-loading]": "loading()",
  },
  template: `
    <ng-content select="viking-chart-card-header" />
    <div [class]="bodyClasses()">
      @if (loading()) {
        <div class="viking-chart-skeleton" aria-hidden="true"></div>
      } @else {
        <ng-content />
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
        min-width: 0;
      }

      :host(.viking-chart-panel-large) {
        min-height: var(--viking-chart-panel-min-height-lg, 26rem);
      }

      :host(.viking-chart-panel-medium) {
        min-height: var(--viking-chart-panel-min-height-md, 24rem);
      }

      .viking-chart-panel-body {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
        padding: var(--viking-space-3) var(--viking-space-4)
          var(--viking-space-4);
        box-sizing: border-box;
        gap: var(--viking-space-2);
      }

      :host(.viking-chart-panel-large) .viking-chart-panel-body {
        --viking-chart-empty-min-height: var(
          --viking-chart-empty-min-height-lg,
          clamp(16rem, 32vw, 19rem)
        );
        --viking-chart-fill-min-height: var(
          --viking-chart-fill-min-height-lg,
          clamp(16rem, 32vw, 19rem)
        );
        min-height: var(--viking-chart-panel-body-min-height-lg, 20rem);
      }

      :host(.viking-chart-panel-medium) .viking-chart-panel-body {
        --viking-chart-empty-min-height: var(
          --viking-chart-empty-min-height,
          clamp(15rem, 30vw, 18rem)
        );
        --viking-chart-fill-min-height: var(
          --viking-chart-fill-min-height,
          clamp(15rem, 30vw, 18rem)
        );
        min-height: var(--viking-chart-panel-body-min-height-md, 18rem);
      }

      :host(.viking-chart-panel-medium.viking-chart-panel-origin-map)
        .viking-chart-panel-body,
      :host(.viking-chart-panel-medium)
        .viking-chart-panel-body.origin-map-container {
        --viking-chart-empty-min-height: var(
          --viking-chart-map-min-height,
          22rem
        );
        min-height: var(--viking-chart-map-min-height, 22rem);
        overflow: hidden;
      }

      :host(.viking-chart-panel-origin-map) ::ng-deep .origin-map-canvas {
        flex: 1 1 auto;
        height: var(--viking-chart-map-min-height, 22rem);
        min-height: var(--viking-chart-map-min-height, 22rem);
        width: 100%;
        display: block;
        border-radius: var(--viking-radius-md, 8px);
        z-index: 0;
        background: var(--viking-surface-inset, var(--viking-surface-alt));
        position: relative;
        visibility: visible;
        overflow: hidden;
      }

      :host(.viking-chart-panel-origin-map) ::ng-deep .leaflet-container {
        width: 100% !important;
        height: 100% !important;
        min-height: var(--viking-chart-map-min-height, 22rem);
        background: var(--viking-surface-inset, var(--viking-surface-alt));
        font: inherit;
        border-radius: inherit;
      }

      :host(.viking-chart-panel-origin-map) ::ng-deep .leaflet-pane,
      :host(.viking-chart-panel-origin-map) ::ng-deep .leaflet-map-pane {
        z-index: 1;
      }

      :host(.viking-chart-panel-origin-map) ::ng-deep .leaflet-tile-pane {
        filter: none;
      }

      :host(.viking-chart-panel-origin-map) ::ng-deep .leaflet-overlay-pane {
        z-index: 4;
      }

      :host(.viking-chart-panel-origin-map) ::ng-deep .leaflet-marker-pane,
      :host(.viking-chart-panel-origin-map) ::ng-deep .leaflet-tooltip-pane {
        z-index: 6;
      }

      :host(.viking-chart-panel-origin-map) ::ng-deep .leaflet-tile {
        max-width: none !important;
        max-height: none !important;
      }

      :host(.viking-chart-panel-loading) .viking-chart-panel-body {
        align-items: center;
        justify-content: center;
      }
    `,
  ],
})
export class VikingChartPanel {
  readonly size = input<VikingChartPanelSize>("medium");
  readonly body = input<VikingChartPanelBody>("default");
  readonly loading = input<boolean>(false);

  protected readonly bodyClasses = computed(() => {
    const sizeClass =
      this.size() === "large"
        ? "chart-container-large"
        : "chart-container-medium";
    const bodyVariant =
      this.body() === "origin-map" ? " origin-map-container" : "";
    return `card-body-clean viking-chart-panel-body ${sizeClass}${bodyVariant}`;
  });
}
