import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If already initialized, we can check synchronously
  if (authService.isInitialized()) {
    return authService.isAuthenticated() ? true : router.parseUrl('/login');
  }

  // Otherwise wait for initialization
  return toObservable(authService.isInitialized).pipe(
    filter(initialized => initialized),
    take(1),
    map(() => {
      return authService.isAuthenticated() ? true : router.parseUrl('/login');
    }),
  );
};
