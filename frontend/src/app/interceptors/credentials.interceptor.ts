import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { from, switchMap } from 'rxjs';

type TokenUser = {
  getIdToken(): Promise<string>;
};

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const firebaseAuth = authService?.auth;
  const currentUser = firebaseAuth?.currentUser as TokenUser | null | undefined;

  if (currentUser) {
    return from(currentUser.getIdToken()).pipe(
      switchMap((token: string) => {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`,
        };
        const sessionId = authService.sessionId();
        if (sessionId) {
          headers['X-DEML-Session-Id'] = sessionId;
        }
        const authReq = req.clone({ setHeaders: headers });
        return next(authReq);
      }),
    );
  }

  return next(req);
};
