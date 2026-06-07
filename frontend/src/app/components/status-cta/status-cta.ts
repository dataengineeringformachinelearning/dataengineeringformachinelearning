import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
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

  login() {
    const dialogRef = this.dialog.open(LoginDialog, {
      width: '400px',
      hasBackdrop: true,
      backdropClass: 'blur-backdrop',
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (result) {
        let success = false;
        if (result.mode === 'register') {
          success = await this.authService.register({
            username: result.username,
            password: result.password,
            email: result.email
          });
        } else {
          success = await this.authService.login({
            username: result.username,
            password: result.password
          });
        }
        if (success) {
          window.location.reload();
        }
      }
    });
  }
}
