import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { VikingIcon } from '@dataengineeringformachinelearning/viking-ui';

/** Official DEML brand mark via viking-ui icons. */
@Component({
  selector: 'deml-brand-logo',
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[class]': 'hostClass()',
  },
  template: `<viking-icon name="deml" [size]="size()" />`,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        line-height: 1;
        vertical-align: middle;
        color: var(--viking-accent, var(--color-primary));
      }
    `,
  ],
})
export class DemlBrandLogo {
  readonly hostClass = input<string>('brand-icon navbar-logo glowing-icon-sm');
  readonly size = input<number>(28);
}
