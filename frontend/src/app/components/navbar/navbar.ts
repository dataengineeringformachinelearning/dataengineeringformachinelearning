import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { VikingSiteNavbar } from '@deml/viking-ui';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-navbar',
  imports: [VikingSiteNavbar],
  template: `
    <viking-site-navbar
      context="app"
      [urls]="siteUrls"
      [isAuthenticated]="authService.isAuthenticated()"
      [theme]="themeService.theme()"
      (login)="login()"
      (logout)="logout()"
      (themeToggle)="themeService.toggleTheme()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar {
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private router = inject(Router);

  protected readonly siteUrls = {
    app: environment.frontendUrl ?? '',
    marketing: environment.marketingUrl ?? 'https://dataengineeringformachinelearning.com',
    backend: environment.backendUrl ?? '',
  };

  login(): void {
    void this.router.navigate(['/login']);
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigate(['/login']);
    window.location.reload();
  }
}
