import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Root `/` is the public product showcase; authenticated visitors go to the dashboard. */
export const rootGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const getRedirectTarget = (isAuthenticated: boolean): boolean | UrlTree => {
    const reportBug = state.url.includes('reportBug=1') ? { reportBug: '1' } : {};
    if (isAuthenticated) {
      return router.createUrlTree(['/dashboard'], { queryParams: reportBug });
    }
    return true;
  };

  // Showcase may render while Firebase restores a session; login redirects once ready.
  return authService.isInitialized() ? getRedirectTarget(authService.isAuthenticated()) : true;
};
