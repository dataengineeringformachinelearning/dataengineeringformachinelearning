import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** viking-metric-row — responsive grid row for HUD metric cards. */
@Component({
  selector: 'viking-metric-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="viking-metric-row hud-metrics"><ng-content /></div>`,
})
export class VikingMetricRow {}

/** viking-metric-card — single KPI tile in a metric row. */
@Component({
  selector: 'viking-metric-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'viking-metric-card metric-card col-span-4 col-span-md-4',
    '[class.viking-metric-card-warning]': "variant() === 'warning'",
    '[class.warning]': "variant() === 'warning'",
    '[class.viking-metric-card-critical]': "variant() === 'critical'",
    '[class.critical]': "variant() === 'critical'",
  },
  template: `
    <span class="viking-metric-label metric-label">{{ label() }}</span>
    <span class="viking-metric-value metric-value"><ng-content />{{ value() }}</span>
  `,
})
export class VikingMetricCard {
  readonly label = input.required<string>();
  readonly value = input<string | number>('');
  readonly variant = input<'default' | 'warning' | 'critical'>('default');
}
