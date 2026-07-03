import { ChangeDetectionStrategy, Component } from '@angular/core';
import { VikingBar, VikingButton, VikingChart, VikingChartSeries } from '@dataengineeringformachinelearning/viking-ui';
import { VikingAppIcon } from '../viking-app-icon/viking-app-icon';

const WHITEPAPER_SPARKLINE: VikingChartSeries[] = [
  {
    name: 'Research activity',
    data: [60, 48, 52, 32, 40, 18, 28, 12, 22, 8, 16],
    tone: 'accent',
  },
];

@Component({
  selector: 'app-whitepaper-cta',
  standalone: true,
  imports: [VikingBar, VikingButton, VikingChart],
  templateUrl: './whitepaper-cta.html',
  styleUrl: './whitepaper-cta.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhitepaperCta {
  readonly sparklineSeries = WHITEPAPER_SPARKLINE;
}
