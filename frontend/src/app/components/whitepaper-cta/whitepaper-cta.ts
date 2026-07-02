import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FluxBar, FluxButton } from '@deml/flux-material';
import { FluxAppIcon } from '../flux-app-icon/flux-app-icon';

@Component({
  selector: 'app-whitepaper-cta',
  standalone: true,
  imports: [FluxBar, FluxButton, FluxAppIcon],
  templateUrl: './whitepaper-cta.html',
  styleUrl: './whitepaper-cta.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhitepaperCta {}
