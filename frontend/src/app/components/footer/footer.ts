import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { VikingSiteFooter } from '@dataengineeringformachinelearning/viking-ui';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-footer',
  imports: [VikingSiteFooter],
  template: `
    <viking-site-footer
      context="app"
      [urls]="siteUrls"
      [isAuthenticated]="authService.isAuthenticated()"
      (bugReport)="openBugReporter($event)"
      (marketingNavigate)="navigateToMarketing($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  protected readonly authService = inject(AuthService);
  protected readonly siteUrls = {
    app: environment.frontendUrl ?? '',
    marketing: environment.marketingUrl ?? 'https://dataengineeringformachinelearning.com',
    backend: environment.backendUrl ?? '',
  };

  openBugReporter(event: Event): void {
    event.preventDefault();
    window.dispatchEvent(new CustomEvent('openBugReporter'));
  }

  navigateToMarketing(targetUrl: string): void {
    void this.authService.navigateToMarketingSite(targetUrl);
  }
}
