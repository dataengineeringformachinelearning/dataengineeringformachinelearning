import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { VikingIcon } from '@dataengineeringformachinelearning/viking-ui';

/** Official DEML brand mark via viking-ui icons. Uses Drakkar (Viking longship) icon. */
@Component({
  selector: 'deml-brand-logo',
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[class]': 'hostClass()',
  },
  template: `<viking-icon name="drakkar" [size]="size()" color="accent" />`,
})
export class DemlBrandLogo {
  readonly hostClass = input<string>('brand-icon navbar-logo');
  readonly size = input<number>(28);
}
