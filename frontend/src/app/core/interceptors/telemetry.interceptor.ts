import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Legacy plaintext endpoint telemetry was removed.
 * SealedEvent → /api/v1/ingest (via FORJD BFF) is the supported telemetry lane.
 * Kept as a no-op interceptor so app.config wiring stays stable.
 */
export const telemetryInterceptor: HttpInterceptorFn = (req, next) => next(req);
