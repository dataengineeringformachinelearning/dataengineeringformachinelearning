import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './navbar.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './navbar.scss',
})
export class Navbar {
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private router = inject(Router);

  public readonly docsUrl = `${environment.marketingUrl}/documentation`;
  public isMobileMenuOpen = signal(false);

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(v => !v);
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
  }

  onThemeToggle(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.themeService.toggleTheme();
  }

  login() {
    this.router.navigate(['/login']);
  }

  async logout() {
    await this.authService.logout();
    await this.router.navigate(['/']);
    window.location.reload();
  }
}
