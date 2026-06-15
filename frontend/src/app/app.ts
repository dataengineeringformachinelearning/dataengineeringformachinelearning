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
import { CookieBanner } from './components/cookie-banner/cookie-banner';
import { Sidebar } from './components/sidebar/sidebar';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Sidebar, Footer, IssueReporter, CookieBanner],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly title = signal('frontend');
  public authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);

  isStandaloneStatusPage = signal(false);
  isDashboardPage = signal(false);

  ngOnInit() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects || event.url || '';
        const isStandalone = url.startsWith('/status/') && url !== '/status';
        this.isStandaloneStatusPage.set(isStandalone);

        const isDashboard = ['/explore', '/documentation', '/settings', '/vulnerabilities'].some(
          path => url.startsWith(path),
        );
        this.isDashboardPage.set(isDashboard);

        if (isPlatformBrowser(this.platformId)) {
          setTimeout(() => {
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;

            const mainContent = document.querySelector('.main-content');
            if (mainContent) mainContent.scrollTop = 0;

            const dashboardContent = document.querySelector('.dashboard-content');
            if (dashboardContent) dashboardContent.scrollTop = 0;
          }, 50); // Small delay to allow DOM to render
        }
      });

    if (isPlatformBrowser(this.platformId)) {
      this.authService.checkAuth();
      this.checkResetToken();
      this.registerServiceWorker();
    }
  }

  registerServiceWorker() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').then(
        registration => console.log('ServiceWorker registered with scope: ', registration.scope),
        err => console.log('ServiceWorker registration failed: ', err),
      );
    }
  }

  checkResetToken() {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const resetUid = urlParams.get('reset_uid');
      const resetToken = urlParams.get('reset_token');
      if (resetUid && resetToken) {
        // Clear params from URL
        const url = new URL(window.location.href);
        url.searchParams.delete('reset_uid');
        url.searchParams.delete('reset_token');
        window.history.replaceState({}, document.title, url.pathname);

        // Navigate to /login page with parameters
        this.router.navigate(['/login'], {
          queryParams: {
            mode: 'reset',
            uid: resetUid,
            token: resetToken,
          },
        });
      }
    }
  }
}
