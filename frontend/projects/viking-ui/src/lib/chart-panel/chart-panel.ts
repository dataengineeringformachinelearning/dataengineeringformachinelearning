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
        min-height: 420px;
      }

      :host(.viking-chart-panel-medium) {
        min-height: 380px;
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
        --viking-chart-empty-min-height: 300px;
        min-height: 320px;
      }

      :host(.viking-chart-panel-medium) .viking-chart-panel-body {
        --viking-chart-empty-min-height: 260px;
        min-height: 280px;
      }

      :host(.viking-chart-panel-medium.viking-chart-panel-origin-map) .viking-chart-panel-body,
      :host(.viking-chart-panel-medium) .viking-chart-panel-body.origin-map-container {
        --viking-chart-empty-min-height: 360px;
        min-height: 360px;
      }
    `,
  ],
})
export class VikingChartPanel {
  readonly size = input<VikingChartPanelSize>('medium');
  readonly body = input<VikingChartPanelBody>('default');

  protected readonly bodyClasses = computed(() => {
    const sizeClass =
      this.size() === 'large' ? 'chart-container-large' : 'chart-container-medium';
    const bodyVariant = this.body() === 'origin-map' ? ' origin-map-container' : '';
    return `card-body-clean viking-chart-panel-body ${sizeClass}${bodyVariant}`;
  });
}
