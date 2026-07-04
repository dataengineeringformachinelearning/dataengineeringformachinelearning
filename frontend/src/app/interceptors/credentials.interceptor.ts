import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { from, switchMap } from 'rxjs';

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const firebaseAuth = authService?.auth;

  if (firebaseAuth && firebaseAuth.currentUser) {
    return from((firebaseAuth.currentUser as any).getIdToken() as Promise<string>).pipe(
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
