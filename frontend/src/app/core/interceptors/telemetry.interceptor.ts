import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { sealAndIngest } from '../crypto/sealed-telemetry';
import { environment } from '../../../environments/environment';

/**
 * Sample authenticated SPA latency into sealed FORJD ingest.
 * Never blocks the primary request; failures are silent.
 */
let lastEmitMs = 0;
const MIN_EMIT_INTERVAL_MS = 15_000;

export const sanitizeTelemetryComponent = (value: string): string =>
  value
    .replace(/[^A-Za-z0-9._:/-]/g, '')
    .replace(/^[^A-Za-z0-9]+/, '')
    .slice(0, 128) || 'spa';

export const telemetryInterceptor: HttpInterceptorFn = (req, next) => {
  // Only instrument DEML backend JSON calls (skip assets / third parties / ingest itself).
  if (!req.url.startsWith(environment.backendUrl) || req.url.includes('/api/v1/ingest')) {
    return next(req);
  }
  // Avoid feedback loops on session / tenant probes.
  if (req.url.includes('/api/v1/sessions') || req.url.includes('/api/v1/forjd/tenant')) {
    return next(req);
  }

  const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const auth = inject(AuthService);

  return next(req).pipe(
    tap({
      next: event => {
        if (!(event instanceof HttpResponse)) return;
        if (!auth.isAuthenticated()) return;
        const now = Date.now();
        if (now - lastEmitMs < MIN_EMIT_INTERVAL_MS) return;

        const elapsed =
          (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started;
        lastEmitMs = now;

        void (async () => {
          try {
            // Firebase user on the AuthService private `auth` is not exported;
            // re-read via the same path credentials interceptor uses: Authorization header
            // is already attached for authenticated calls — recover token from Firebase if present.
            const firebaseUser = (
              auth as unknown as { auth?: { currentUser?: { getIdToken: () => Promise<string> } } }
            ).auth?.currentUser;
            if (!firebaseUser?.getIdToken) return;
            const token = await firebaseUser.getIdToken();
            if (!token) return;
            const path = req.url.replace(environment.backendUrl, '').split('?')[0] || '/';
            const statusFamily = `${Math.floor((event.status || 200) / 100)}xx`;
            await sealAndIngest(
              token,
              {
                kind: 'deml.spa_metric',
                path,
                method: req.method,
                status: event.status,
                latency_ms: Math.round(elapsed),
                ts: Date.now() / 1000,
              },
              {
                component: sanitizeTelemetryComponent(path),
                label: statusFamily,
                channel: 'spa-interceptor',
                region: 'browser',
              },
            );
          } catch {
            /* sealed telemetry is best-effort */
          }
        })();
      },
    }),
  );
};
