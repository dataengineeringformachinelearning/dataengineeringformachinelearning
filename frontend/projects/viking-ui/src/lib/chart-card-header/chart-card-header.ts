import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * viking-chart-card-header — shared label / value / trend header for analytics chart cards.
 */
@Component({
  selector: 'viking-chart-card-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'chart-custom-header' },
  template: `
    <div class="chart-custom-title">{{ title() }}</div>
    @if (hasData()) {
      <div class="chart-custom-value">{{ value() }}</div>
      @if (trend()) {
        <div class="chart-custom-trend">{{ trend() }}</div>
      }
    } @else {
      <div class="chart-custom-value chart-value-muted">{{ emptyLabel() }}</div>
    }
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--viking-space-half, 4px);
        padding: var(--viking-space-2, 16px) var(--viking-space-3, 24px) var(--viking-space-1, 8px);
        width: 100%;
        box-sizing: border-box;
        flex-shrink: 0;
        border-bottom: 1px solid var(--viking-border-subtle);
        margin-bottom: 0;
      }

      .chart-custom-title {
        color: var(--viking-text-muted, var(--text-muted));
        font-size: var(--viking-font-size-ui, 14px);
        font-family: var(--viking-font-family);
        letter-spacing: var(--viking-letter-spacing-wide, 0.025em);
        font-weight: var(--viking-font-weight-semibold, 600);
        margin: 0;
      }

      .chart-custom-value {
        color: var(--viking-text, var(--text-color));
        font-size: var(--viking-font-size-lg, 20px);
        font-family: var(--viking-font-family);
        font-weight: var(--viking-font-weight-bold, 700);
        line-height: var(--viking-line-height-tight, 1.25);
        margin: 0;
      }

      .chart-custom-trend {
        color: var(--color-primary);
        font-size: var(--viking-font-size-sm, 14px);
        font-family: var(--viking-font-family);
        font-weight: var(--viking-font-weight-semibold, 600);
        letter-spacing: 0.02em;
        margin: 0;
      }

      .chart-value-muted {
        font-size: 1.125rem !important;
        font-weight: var(--viking-font-weight-semibold, 600) !important;
        color: var(--text-muted) !important;
        letter-spacing: var(--viking-letter-spacing-caps, 0.05em);
        text-transform: uppercase;
      }
    `,
  ],
})
export class VikingChartCardHeader {
  readonly title = input.required<string>();
  readonly value = input<string>('');
  readonly emptyLabel = input<string>('Awaiting signal');
  readonly trend = input<string>('');
  readonly hasData = input<boolean>(false);
}
