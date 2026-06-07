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
        const authReq = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
        return next(authReq);
      })
    );
  }
  
  return next(req);
};
