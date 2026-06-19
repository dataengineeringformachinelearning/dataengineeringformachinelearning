import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

export const cacheInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  // Only apply cache busting to GET requests
  if (req.method === 'GET') {
    // Clone the request and set Cache-Control headers instead of polluting the URL with query params
    const noCacheReq = req.clone({
      setHeaders: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
    return next(noCacheReq);
  }

  return next(req);
};
