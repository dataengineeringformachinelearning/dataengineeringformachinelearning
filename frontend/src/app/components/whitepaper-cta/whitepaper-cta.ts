import { ChangeDetectionStrategy, Component } from '@angular/core';
import { VikingBar, VikingButton } from '@deml/viking-ui';
import { VikingAppIcon } from '../viking-app-icon/viking-app-icon';

@Component({
  selector: 'app-whitepaper-cta',
  standalone: true,
  imports: [VikingBar, VikingButton, VikingAppIcon],
  templateUrl: './whitepaper-cta.html',
  styleUrl: './whitepaper-cta.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhitepaperCta {}
