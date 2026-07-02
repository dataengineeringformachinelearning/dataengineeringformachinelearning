import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type FluxUptimeStatus = 'operational' | 'partial_outage' | 'major_outage' | 'no_data';

/** flux-uptime-bar — timeline bar for uptime history visualizations. */
@Component({
  selector: 'flux-uptime-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flux-uptime-bar',
    '[class.flux-uptime-partial]': "status() === 'partial_outage'",
    '[class.flux-uptime-major]': "status() === 'major_outage'",
    '[class.flux-uptime-nodata]': "status() === 'no_data'",
    '[attr.title]': 'title()',
  },
  template: '',
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        border-radius: var(--flux-radius);
        background: var(--flux-success);
      }
      :host(.flux-uptime-partial) {
        height: 70%;
        align-self: flex-end;
        background: var(--flux-warning);
      }
      :host(.flux-uptime-major) {
        height: 40%;
        align-self: flex-end;
        background: var(--flux-danger);
      }
      :host(.flux-uptime-nodata) {
        background: var(--flux-text-muted);
        opacity: 0.35;
      }
    `,
  ],
})
export class FluxUptimeBar {
  readonly status = input<FluxUptimeStatus>('operational');
  readonly title = input<string>('');
}
