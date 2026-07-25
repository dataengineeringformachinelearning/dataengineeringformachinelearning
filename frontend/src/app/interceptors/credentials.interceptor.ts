import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { from, of, switchMap, catchError } from 'rxjs';

type TokenUser = {
  getIdToken(forceRefresh?: boolean): Promise<string>;
};

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const firebaseAuth = authService?.auth;
  const currentUser = firebaseAuth?.currentUser as TokenUser | null | undefined;

  if (!currentUser) {
    return next(req);
  }

  // Prefer a fresh token once if the cached token cannot be read (expired session).
  return from(currentUser.getIdToken()).pipe(
    catchError(() => from(currentUser.getIdToken(true))),
    catchError(() => of('')),
    switchMap((token: string) => {
      if (!token) {
        return next(req);
      }
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };
      const sessionId = authService.sessionId();
      if (sessionId) {
        headers['X-DEML-Session-Id'] = sessionId;
      }
      return next(req.clone({ setHeaders: headers }));
    }),
  );
};
