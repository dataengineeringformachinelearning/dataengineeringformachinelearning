import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FluxIcon } from '@deml/flux-material';

/** Official DEML brand mark via flux-material icons. */
@Component({
  selector: 'deml-brand-logo',
  imports: [FluxIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[class]': 'hostClass()',
  },
  template: `<flux-icon name="bar-chart" [size]="size()" />`,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        line-height: 1;
        vertical-align: middle;
        color: var(--flux-accent, var(--color-primary));
      }
    `,
  ],
})
export class DemlBrandLogo {
  readonly hostClass = input<string>('brand-icon navbar-logo glowing-icon-sm');
  readonly size = input<number>(28);
}
