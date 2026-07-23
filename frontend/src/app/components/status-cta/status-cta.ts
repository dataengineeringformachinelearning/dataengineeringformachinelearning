import { Component, inject, ChangeDetectionStrategy, input } from '@angular/core';

import { Router } from '@angular/router';
import {
  VikingButton,
  VikingPageMockup,
  type VikingPageMockupVariant,
} from '@dataengineeringformachinelearning/viking-ui';
import { VikingAppIcon } from '../viking-app-icon/viking-app-icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-status-cta',
  standalone: true,
  imports: [VikingButton, VikingAppIcon, VikingPageMockup],
  templateUrl: './status-cta.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusCta {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly title = input('Track your Services');
  readonly subtitle = input(
    'Create and publish real-time status pages to monitor your APIs. Keep your users informed and track uptime statistics.',
  );
  readonly badgeIcon = input('verified_user');
  readonly badgeText = input('API Monitoring Console');
  readonly mockupVariant = input<VikingPageMockupVariant>('status');
  readonly showMockup = input(true);

  login() {
    void this.router.navigate(['/login']);
  }
}
