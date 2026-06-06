import { HttpInterceptorFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs/operators';
import { TelemetryService, TelemetryPayload } from '../services/telemetry.service';
import { API_ENDPOINTS } from '../constants/api.constants';

export const telemetryInterceptor: HttpInterceptorFn = (req, next) => {
  const telemetryService = inject(TelemetryService);
  const startTime = Date.now();

  return next(req).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          // Exclude the telemetry endpoint to prevent infinite loops
          if (!req.url.includes(API_ENDPOINTS.TELEMETRY.ENDPOINTS)) {
            const responseTimeMs = Date.now() - startTime;
            const payload: TelemetryPayload = {
              url: req.url,
              status_code: event.status,
              response_time_ms: responseTimeMs,
              ip_address: '0.0.0.0', // Handled by backend if needed
              is_active: true
            };
            telemetryService.reportEndpointStatus(payload);
          }
        }
      },
      error: (error) => {
        if (error instanceof HttpErrorResponse) {
          if (!req.url.includes(API_ENDPOINTS.TELEMETRY.ENDPOINTS)) {
            const responseTimeMs = Date.now() - startTime;
            const payload: TelemetryPayload = {
              url: req.url,
              status_code: error.status || 500,
              response_time_ms: responseTimeMs,
              ip_address: '0.0.0.0',
              is_active: error.status >= 200 && error.status < 400
            };
            telemetryService.reportEndpointStatus(payload);
          }
        }
      }
    })
  );
};
