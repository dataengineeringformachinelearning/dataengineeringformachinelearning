import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { VikingAppHeader } from '@dataengineeringformachinelearning/viking-ui';
import { VikingAppIcon } from '../viking-app-icon/viking-app-icon';
import { DemlBrandLogo } from '../deml-brand-logo/deml-brand-logo';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, VikingAppHeader, VikingAppIcon, DemlBrandLogo],
  templateUrl: './navbar.html',
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class Navbar {
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private router = inject(Router);

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
