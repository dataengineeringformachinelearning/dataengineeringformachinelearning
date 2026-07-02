import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** viking-bar — vertical bar for mock charts and decorative grids. */
@Component({
  selector: 'viking-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'viking-bar',
    '[style.--viking-bar-height.%]': 'height()',
  },
  template: '',
  styles: [
    `
      :host {
        display: block;
        flex: 1;
        height: calc(var(--viking-bar-height, 50) * 1%);
        background: linear-gradient(
          180deg,
          var(--viking-accent),
          var(--viking-accent-strong, var(--viking-info))
        );
        border-radius: 4px 4px 0 0;
        opacity: 0.85;
      }
    `,
  ],
})
export class VikingBar {
  readonly height = input<number>(50);
}
