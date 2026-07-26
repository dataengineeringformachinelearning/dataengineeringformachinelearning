import {
  Component,
  signal,
  inject,
  OnInit,
  ChangeDetectionStrategy,
  PLATFORM_ID,
} from '@angular/core';
import {
  RouterOutlet,
  Router,
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
} from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { Footer } from './components/footer/footer';
import { AuthService } from './services/auth.service';
import { isPlatformBrowser } from '@angular/common';
import { IssueReporter } from './components/issue-reporter/issue-reporter';
import { Sidebar } from './components/sidebar/sidebar';
import { PageMetaService } from './services/page-meta.service';

import {
  VikingAppLayout,
  VikingPageSkeleton,
  VikingPreferences,
  VikingPreferencesService,
  VikingShortcutHelp,
  VikingShortcutHelpService,
  VikingToaster,
} from '@dataengineeringformachinelearning/viking-ui';
import { ConfirmDialog } from './components/confirm-dialog/confirm-dialog';
import { OnboardingWizard } from './components/onboarding-wizard/onboarding-wizard';
import { CommandPalette } from './components/command-palette/command-palette';
import { SessionStateService } from './services/session-state.service';
import { reloadOnceOnChunkError } from './core/chunk-load-recovery';
import { RoutePrefetchService } from './core/route-prefetch.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    Navbar,
    Sidebar,
    Footer,
    IssueReporter,
    VikingToaster,
    VikingAppLayout,
    VikingPageSkeleton,
    ConfirmDialog,
    OnboardingWizard,
    CommandPalette,
    VikingShortcutHelp,
    VikingPreferences,
  ],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  protected readonly title = signal('frontend');
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private pageMeta = inject(PageMetaService);
  private sessionState = inject(SessionStateService);
  private routePrefetch = inject(RoutePrefetchService);
  constructor() {
    // Bind `?` help (ADR-0023) + preferences sync (ADR-0024).
    inject(VikingShortcutHelpService);
    inject(VikingPreferencesService);
  }

  isStandaloneStatusPage = signal(false);
  isDashboardPage = signal(false);
  isAuthStatusPage = signal(false);
  /** True while a path navigation is in flight (aria-busy only — outlet stays mounted). */
  routeLoading = signal(false);
  /** Last path that received main-content focus after NavigationEnd. */
  private lastFocusedPath = '';

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.isAuthStatusPage.set(window.location.pathname.startsWith('/auth-status'));
    }
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        // Path-only: query/hash changes (e.g. dashboard tab) must not blank the shell.
        if (!this.isAuthStatusPage()) {
          const currentPath = this.router.url.split(/[?#]/)[0];
          const nextPath = event.url.split(/[?#]/)[0];
          if (currentPath !== nextPath) {
            this.routeLoading.set(true);
          }
        }
        return;
      }

      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.routeLoading.set(false);
      }

      if (event instanceof NavigationError) {
        if (isPlatformBrowser(this.platformId)) {
          reloadOnceOnChunkError(event.error);
        }
        return;
      }

      if (!(event instanceof NavigationEnd)) {
        return;
      }

      const url = event.urlAfterRedirects || event.url || '';
      const nextPath = url.split(/[?#]/)[0];
      const pathChanged = nextPath !== this.lastFocusedPath;
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

      // SPA keyboard/SR: move focus to main when the path changes (not query/hash).
      if (pathChanged && isPlatformBrowser(this.platformId) && !this.isAuthStatusPage()) {
        this.lastFocusedPath = nextPath;
        queueMicrotask(() => {
          const main = document.getElementById('main-content');
          main?.focus({ preventScroll: true });
        });
      }
    });

    if (isPlatformBrowser(this.platformId) && !this.isAuthStatusPage()) {
      this.sessionState.init();
      void this.initializeAuthentication();
      this.checkResetToken();
      this.scheduleServiceWorkerRegistration();
    }
  }

  private async initializeAuthentication(): Promise<void> {
    try {
      // Firebase onAuthStateChanged already syncs /auth/user — wait for settle
      // instead of a second checkAuth() round-trip on the critical path.
      await this.authService.whenInitialized();
      this.sessionState.syncAuthState();
      // Warm shared reads so the first authenticated click feels cached.
      if (this.authService.isAuthenticated()) {
        this.routePrefetch.warmAuthenticatedData();
      }
    } catch (error: unknown) {
      console.error('Authentication initialization failed:', error);
    }
  }

  /** Defer SW install/cache so first paint is not racing for bandwidth. */
  private scheduleServiceWorkerRegistration(): void {
    if (typeof window === 'undefined' || window.location.pathname.startsWith('/auth-status')) {
      return;
    }
    const register = (): void => {
      void this.registerServiceWorker();
    };
    const idleWindow = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    if (typeof idleWindow.requestIdleCallback === 'function') {
      idleWindow.requestIdleCallback(register, { timeout: 30_000 });
      return;
    }
    // Fallback: wait past first paint / load before registering.
    globalThis.setTimeout(register, 8_000);
  }

  private async registerServiceWorker(): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }
    if (window.location.pathname.startsWith('/auth-status')) {
      return;
    }
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('ServiceWorker registered with scope: ', registration.scope);
    } catch (err) {
      console.log('ServiceWorker registration failed: ', err);
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
