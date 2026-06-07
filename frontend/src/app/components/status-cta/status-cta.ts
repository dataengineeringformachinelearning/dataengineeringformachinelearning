import { Component, inject, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../services/auth.service';
import { LoginDialog } from '../login-dialog/login-dialog';

@Component({
  selector: 'app-status-cta',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './status-cta.html',
  styleUrl: './status-cta.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusCta {
  public authService = inject(AuthService);
  private dialog = inject(MatDialog);

  @Input() title = 'Track your Services';
  @Input() subtitle = 'Create and publish real-time status pages to monitor your APIs. Keep your users informed and track uptime statistics.';
  @Input() badgeIcon = 'verified_user';
  @Input() badgeText = 'API Monitoring Console';

  login() {
    const dialogRef = this.dialog.open(LoginDialog, {
      width: '400px',
      hasBackdrop: true,
      backdropClass: 'blur-backdrop',
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (result === true) {
        window.location.reload();
      }
    });
  }
}
