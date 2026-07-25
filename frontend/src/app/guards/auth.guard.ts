import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs/operators';

const loginTree = (router: Router, returnUrl: string) =>
  router.createUrlTree(['/login'], {
    queryParams: returnUrl && returnUrl !== '/login' ? { returnUrl } : undefined,
  });

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const returnUrl = state.url || '/dashboard';

  // If already initialized, we can check synchronously
  if (authService.isInitialized()) {
    return authService.isAuthenticated() ? true : loginTree(router, returnUrl);
  }

  // Otherwise wait for initialization
  return toObservable(authService.isInitialized).pipe(
    filter(initialized => initialized),
    take(1),
    map(() => {
      return authService.isAuthenticated() ? true : loginTree(router, returnUrl);
    }),
  );
};
