import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const rootGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const getRedirectTarget = (isAuthenticated: boolean): boolean | UrlTree => {
    const reportBug = state.url.includes('reportBug=1') ? { reportBug: '1' } : {};
    if (isAuthenticated) {
      return router.createUrlTree(['/dashboard'], { queryParams: reportBug });
    }
    // Render login at / so SSR serves index.html meta (e.g. Algolia site verification).
    const path = (state.url.split('?')[0] ?? '/').replace(/\/+$/, '') || '/';
    if (path === '/') {
      return true;
    }
    return router.createUrlTree(['/'], { queryParams: reportBug });
  };

  // The login route is safe to render while Firebase restores its session.
  // Its auth effect redirects returning users once initialization completes.
  return authService.isInitialized() ? getRedirectTarget(authService.isAuthenticated()) : true;
};
