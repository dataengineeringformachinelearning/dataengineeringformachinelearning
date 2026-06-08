import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
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

  public isMobileMenuOpen = signal(false);

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(v => !v);
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
  }

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

  async logout() {
    await this.authService.logout();
    await this.router.navigate(['/']);
    window.location.reload();
  }
}
