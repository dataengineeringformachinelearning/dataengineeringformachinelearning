import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { LoginDialog } from '../login-dialog/login-dialog';

@Component({
  selector: 'app-navbar',
  imports: [
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    CommonModule,
    MatDialogModule,
  ],
  templateUrl: './navbar.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './navbar.scss',
})
export class Navbar {
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
          if (!success) {
            alert('Registration failed. Username may already exist.');
          }
        } else {
          success = await this.authService.login({
            username: result.username,
            password: result.password
          });
          if (!success) {
            alert('Login failed. Please check your credentials.');
          }
        }
      }
    });
  }

  logout() {
    this.authService.logout();
  }
}
