import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type VikingChartPanelSize = 'large' | 'medium';
export type VikingChartPanelBody = 'default' | 'origin-map';

/**
 * viking-chart-panel — outlined analytics card shell with consistent header/body rhythm.
 */
@Component({
  selector: 'viking-chart-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'status-card-outlined viking-chart-panel',
    '[class.viking-chart-panel-large]': "size() === 'large'",
    '[class.viking-chart-panel-medium]': "size() === 'medium'",
    '[class.viking-chart-panel-origin-map]': "body() === 'origin-map'",
  },
  template: `
    <ng-content select="viking-chart-card-header" />
    <div [class]="bodyClasses()">
      <ng-content />
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
        min-height: var(--viking-chart-panel-min-height-lg, 28rem);
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
        padding: 0 var(--viking-space-3, 24px) var(--viking-space-3, 24px);
        box-sizing: border-box;
      }

      :host(.viking-chart-panel-large) .viking-chart-panel-body {
        --viking-chart-empty-min-height: var(--viking-chart-empty-min-height-lg, 18.75rem);
        --viking-chart-fill-min-height: var(--viking-chart-fill-min-height-lg, clamp(17.5rem, 36vw, 20rem));
        --viking-chart-fill-max-height: var(--viking-chart-fill-max-height-lg, clamp(20rem, 44vw, 22rem));
        min-height: var(--viking-chart-panel-body-min-height-lg, 22.5rem);
      }

      :host(.viking-chart-panel-medium) .viking-chart-panel-body {
        --viking-chart-empty-min-height: var(--viking-chart-empty-min-height, clamp(16rem, 32vw, 17.5rem));
        --viking-chart-fill-min-height: var(--viking-chart-fill-min-height, clamp(16rem, 32vw, 17.5rem));
        --viking-chart-fill-max-height: var(--viking-chart-fill-max-height, clamp(17.5rem, 40vw, 21rem));
        min-height: var(--viking-chart-panel-body-min-height-md, 19rem);
      }

      :host(.viking-chart-panel-medium.viking-chart-panel-origin-map) .viking-chart-panel-body,
      :host(.viking-chart-panel-medium) .viking-chart-panel-body.origin-map-container {
        --viking-chart-empty-min-height: var(--viking-chart-map-min-height, 22.5rem);
        min-height: var(--viking-chart-map-min-height, 22.5rem);
      }
    `,
  ],
})
export class VikingChartPanel {
  readonly size = input<VikingChartPanelSize>('medium');
  readonly body = input<VikingChartPanelBody>('default');

  protected readonly bodyClasses = computed(() => {
    const sizeClass = this.size() === 'large' ? 'chart-container-large' : 'chart-container-medium';
    const bodyVariant = this.body() === 'origin-map' ? ' origin-map-container' : '';
    return `card-body-clean viking-chart-panel-body ${sizeClass}${bodyVariant}`;
  });
}
