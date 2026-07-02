import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** flux-metric-row — responsive grid row for HUD metric cards. */
@Component({
  selector: 'flux-metric-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="flux-metric-row hud-metrics"><ng-content /></div>`,
})
export class FluxMetricRow {}

/** flux-metric-card — single KPI tile in a metric row. */
@Component({
  selector: 'flux-metric-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flux-metric-card metric-card col-span-4 col-span-md-4',
    '[class.flux-metric-card-warning]': "variant() === 'warning'",
    '[class.warning]': "variant() === 'warning'",
    '[class.flux-metric-card-critical]': "variant() === 'critical'",
    '[class.critical]': "variant() === 'critical'",
  },
  template: `
    <span class="flux-metric-label metric-label">{{ label() }}</span>
    <span class="flux-metric-value metric-value"><ng-content />{{ value() }}</span>
  `,
})
export class FluxMetricCard {
  readonly label = input.required<string>();
  readonly value = input<string | number>('');
  readonly variant = input<'default' | 'warning' | 'critical'>('default');
}
