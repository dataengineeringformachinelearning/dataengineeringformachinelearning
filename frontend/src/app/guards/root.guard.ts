import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

export const rootGuard: CanActivateFn = (
  _route,
  _state,
): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  const getRedirectTarget = (isAuthenticated: boolean): UrlTree | boolean => {
    if (isAuthenticated) {
      return router.parseUrl('/dashboard');
    }
    if (isPlatformBrowser(platformId)) {
      window.location.replace(environment.marketingUrl);
      return false;
    }
    return router.parseUrl('/login');
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
