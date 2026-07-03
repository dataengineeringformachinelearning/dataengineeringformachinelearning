import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

export const rootGuard: CanActivateFn = (
  _route,
  _state,
): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const getRedirectTarget = (isAuthenticated: boolean): UrlTree => {
    const reportBug = _state.url.includes('reportBug=1') ? { reportBug: '1' } : {};
    if (isAuthenticated) {
      return router.createUrlTree(['/dashboard'], { queryParams: reportBug });
    }
    return router.createUrlTree(['/login'], { queryParams: reportBug });
  };

  if (authService.isInitialized()) {
    return getRedirectTarget(authService.isAuthenticated());
  }

  return toObservable(authService.isInitialized).pipe(
    filter((initialized): boolean => initialized),
    take(1),
    map((): UrlTree => getRedirectTarget(authService.isAuthenticated())),
  );
};
