import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** flux-bar — vertical bar for mock charts and decorative grids. */
@Component({
  selector: 'flux-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flux-bar',
    '[style.--flux-bar-height.%]': 'height()',
  },
  template: '',
  styles: [
    `
      :host {
        display: block;
        flex: 1;
        height: calc(var(--flux-bar-height, 50) * 1%);
        background: linear-gradient(
          180deg,
          var(--flux-accent),
          var(--flux-accent-strong, var(--flux-info))
        );
        border-radius: 4px 4px 0 0;
        opacity: 0.85;
      }
    `,
  ],
})
export class FluxBar {
  readonly height = input<number>(50);
}
