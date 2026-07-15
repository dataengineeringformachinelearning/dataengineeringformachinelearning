import {
  Component,
  signal,
  inject,
  OnInit,
  ChangeDetectionStrategy,
  PLATFORM_ID,
} from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { Footer } from './components/footer/footer';
import { AuthService } from './services/auth.service';
import { isPlatformBrowser } from '@angular/common';
import { IssueReporter } from './components/issue-reporter/issue-reporter';
import { Sidebar } from './components/sidebar/sidebar';
import { filter } from 'rxjs/operators';
import { PageMetaService } from './services/page-meta.service';

import {
  VikingAppLayout,
  VikingSpinner,
  VikingToaster,
} from '@dataengineeringformachinelearning/viking-ui';
import { ConfirmDialog } from './components/confirm-dialog/confirm-dialog';
import { OnboardingWizard } from './components/onboarding-wizard/onboarding-wizard';
import { CommandPalette } from './components/command-palette/command-palette';
import { SessionStateService } from './services/session-state.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    Navbar,
    Sidebar,
    Footer,
    IssueReporter,
    VikingSpinner,
    VikingToaster,
    VikingAppLayout,
    ConfirmDialog,
    OnboardingWizard,
    CommandPalette,
  ],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  protected readonly title = signal('frontend');
  public authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private pageMeta = inject(PageMetaService);
  private sessionState = inject(SessionStateService);

  isStandaloneStatusPage = signal(false);
  isDashboardPage = signal(false);
  isAuthStatusPage = signal(false);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.isAuthStatusPage.set(window.location.pathname.startsWith('/auth-status'));
    }
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects || event.url || '';
        this.pageMeta.applyForUrl(url);
        this.checkDeepLinkActions();
        const isStandalone = url.startsWith('/status/') && url !== '/status';
        this.isStandaloneStatusPage.set(isStandalone);

        const isDashboard = [
          '/dashboard',
          '/explore',
          '/settings',
          '/account',
          '/vulnerabilities',
          '/analytics',
          '/status',
        ].some(path => url === path || url.startsWith(`${path}/`) || url.startsWith(`${path}?`));
        // Isolated public status pages (/status/:slug) stay full-bleed without app chrome sidebar.
        const isStandaloneStatus = url.startsWith('/status/') && url !== '/status';
        this.isDashboardPage.set(isDashboard && !isStandaloneStatus);
      });

    if (isPlatformBrowser(this.platformId) && !this.isAuthStatusPage()) {
      this.sessionState.init();
      void this.initializeAuthentication();
      this.checkResetToken();
      this.registerServiceWorker();
    }
  }

  private async initializeAuthentication(): Promise<void> {
    try {
      await this.authService.checkAuth();
      this.sessionState.syncAuthState();
    } catch (error: unknown) {
      console.error('Authentication initialization failed:', error);
    }
  }

  async registerServiceWorker() {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth-status')) {
      return;
    }

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('ServiceWorker registered with scope: ', registration.scope);
      } catch (err) {
        console.log('ServiceWorker registration failed: ', err);
      }
    }
  }

  checkResetToken() {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const resetUid = urlParams.get('reset_uid');
      const resetToken = urlParams.get('reset_token');
      if (resetUid && resetToken) {
        const url = new URL(window.location.href);
        url.searchParams.delete('reset_uid');
        url.searchParams.delete('reset_token');
        window.history.replaceState({}, document.title, url.pathname);

        void this.router.navigate(['/login'], {
          queryParams: {
            mode: 'reset',
            uid: resetUid,
            token: resetToken,
          },
        });
      }
    }
  }

  checkDeepLinkActions(): void {
    if (typeof window === 'undefined') {
      return;
    }
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('reportBug') === '1') {
      urlParams.delete('reportBug');
      const nextQuery = urlParams.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash}`;
      window.history.replaceState({}, document.title, nextUrl);
      window.dispatchEvent(new CustomEvent('openBugReporter'));
    }
  }
}
