import { ChangeDetectionStrategy, Component } from '@angular/core';
import { VikingWhitepaperCta } from '@dataengineeringformachinelearning/viking-ui';

/** Thin app wrapper — delegates to canonical viking-whitepaper-cta. */
@Component({
  selector: 'app-whitepaper-cta',
  standalone: true,
  imports: [VikingWhitepaperCta],
  template: `
    <viking-whitepaper-cta
      href="https://dataengineeringformachinelearning.com/whitepaper/"
      [external]="true"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhitepaperCta {}
