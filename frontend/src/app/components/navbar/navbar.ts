import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { LoginDialog } from '../login-dialog/login-dialog';

@Component({
  selector: 'app-navbar',
  imports: [
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    CommonModule,
    MatDialogModule,
  ],
  templateUrl: './navbar.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './navbar.scss',
})
export class Navbar {
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

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

  async logout() {
    await this.authService.logout();
    await this.router.navigate(['/']);
    window.location.reload();
  }
}
