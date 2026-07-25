import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';

// --- Session recovery (avoid 401 logout loops) ---
let handling401 = false;

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const hadAuth = req.headers.has('Authorization');
      if (
        error.status === 401 &&
        hadAuth &&
        auth.isAuthenticated() &&
        !handling401 &&
        !req.url.includes('/api/v1/auth/')
      ) {
        handling401 = true;
        const returnUrl = router.url && router.url !== '/login' ? router.url : '/dashboard';
        void auth
          .logout()
          .catch(() => undefined)
          .finally(() => {
            handling401 = false;
            void router.navigate(['/login'], {
              queryParams: { returnUrl, reason: 'session' },
            });
          });
      }

      if (error.status === 0 || error.error instanceof ErrorEvent) {
        console.error('[Global Error Interceptor] Network error', error.message);
      } else if (error.status >= 500) {
        console.error('[Global Error Interceptor] Server error', error.status, error.message);
      }

      return throwError(() => error);
    }),
  );
};
