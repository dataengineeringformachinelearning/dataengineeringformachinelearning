import { HttpInterceptorFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs/operators';
import { TelemetryService, TelemetryPayload } from '../services/telemetry.service';
import { API_ENDPOINTS } from '../constants/api.constants';
import { environment } from '../../../environments/environment';

export const telemetryInterceptor: HttpInterceptorFn = (req, next) => {
  // This legacy payload is plaintext and the old endpoint is not part of the
  // FORJD contract. SealedEvent → /api/v1/ingest is the supported telemetry lane.
  if (!environment.enableLegacyPlaintextTelemetry) {
    return next(req);
  }
  const telemetryService = inject(TelemetryService);
  const startTime = Date.now();
  const sanitizedUrl = req.url.split(/[?#]/, 1)[0];

  return next(req).pipe(
    tap({
      next: event => {
        if (event instanceof HttpResponse) {
          // Exclude the telemetry endpoint to prevent infinite loops
          if (!req.url.includes(API_ENDPOINTS.TELEMETRY.ENDPOINTS)) {
            const responseTimeMs = Date.now() - startTime;
            const payload: TelemetryPayload = {
              url: sanitizedUrl,
              status_code: event.status,
              response_time_ms: responseTimeMs,
              ip_address: '0.0.0.0', // Handled by backend if needed
              is_active: true,
            };
            telemetryService.reportEndpointStatus(payload);
          }
        }
      },
      error: error => {
        if (error instanceof HttpErrorResponse) {
          // Ignore status 0 (cancelled/aborted requests, CORS preflight failures, or adblocker blocks)
          // to prevent reporting false outages.
          if (error.status !== 0 && !req.url.includes(API_ENDPOINTS.TELEMETRY.ENDPOINTS)) {
            const responseTimeMs = Date.now() - startTime;
            const payload: TelemetryPayload = {
              url: sanitizedUrl,
              status_code: error.status || 500,
              response_time_ms: responseTimeMs,
              ip_address: '0.0.0.0',
              is_active: error.status > 0 && error.status < 500,
            };
            telemetryService.reportEndpointStatus(payload);
          }
        }
      },
    }),
  );
};
