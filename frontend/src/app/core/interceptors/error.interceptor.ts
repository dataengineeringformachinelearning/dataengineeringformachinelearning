import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = '';

      if (error.error instanceof ErrorEvent) {
        // Client-side or network error
        errorMessage = `A network error occurred: ${error.error.message}`;
      } else {
        // Backend error
        errorMessage = `Server returned code: ${error.status}, error message is: ${error.message}`;
      }

      // We can log it to the console or use a Toast/Snackbar service here
      console.error('[Global Error Interceptor]', errorMessage);

      // Re-throw the error so it can be handled by the component if needed
      return throwError(() => error);
    }),
  );
};
