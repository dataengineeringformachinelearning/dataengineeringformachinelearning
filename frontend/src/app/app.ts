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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { LoginDialog } from './components/login-dialog/login-dialog';
import { CookieBanner } from './components/cookie-banner/cookie-banner';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer, IssueReporter, MatDialogModule, CookieBanner],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly title = signal('frontend');
  public authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);

  isStandaloneStatusPage = signal(false);

  ngOnInit() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects || event.url || '';
        const isStandalone = url.startsWith('/status/') && url !== '/status';
        this.isStandaloneStatusPage.set(isStandalone);
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

        // Open Dialog
        this.dialog.open(LoginDialog, {
          width: '400px',
          hasBackdrop: true,
          backdropClass: 'blur-backdrop',
          data: {
            mode: 'reset',
            uid: resetUid,
            token: resetToken,
          },
        });
      }
    }
  }
}
