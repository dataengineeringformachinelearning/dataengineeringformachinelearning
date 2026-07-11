import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { VikingSiteNavbar } from '@dataengineeringformachinelearning/viking-ui';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { SearchService } from '../../services/search.service';
import { SessionStateService } from '../../services/session-state.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-navbar',
  imports: [VikingSiteNavbar],
  template: `
    <viking-site-navbar
      context="app"
      [urls]="siteUrls"
      [isAuthenticated]="authService.isAuthenticated()"
      [isBusy]="authService.isProcessing()"
      [theme]="themeService.theme()"
      [showSearch]="true"
      (login)="login()"
      (logout)="logout()"
      (searchOpen)="searchService.open()"
      (themeToggle)="themeService.toggleTheme()"
      (marketingNavigate)="navigateToMarketing($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar {
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  public searchService = inject(SearchService);
  private router = inject(Router);
  private sessionState = inject(SessionStateService);

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
    this.sessionState.broadcastLogout();
    void this.router.navigate(['/login']);
  }

  navigateToMarketing(targetUrl: string): void {
    void this.authService.navigateToMarketingSite(targetUrl);
  }
}
