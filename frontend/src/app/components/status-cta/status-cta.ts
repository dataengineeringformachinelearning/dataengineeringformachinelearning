import { Component, inject, ChangeDetectionStrategy, Input } from '@angular/core';

import { RouterModule, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-status-cta',
  standalone: true,
  imports: [RouterModule, MatButtonModule, MatIconModule],
  templateUrl: './status-cta.html',
  styleUrl: './status-cta.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusCta {
  public authService = inject(AuthService);
  private router = inject(Router);

  @Input() title = 'Track your Services';
  @Input() subtitle =
    'Create and publish real-time status pages to monitor your APIs. Keep your users informed and track uptime statistics.';
  @Input() badgeIcon = 'verified_user';
  @Input() badgeText = 'API Monitoring Console';

  login() {
    this.router.navigate(['/login']);
  }
}
