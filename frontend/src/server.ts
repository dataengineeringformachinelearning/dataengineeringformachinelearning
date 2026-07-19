import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

/** Firebase web config served at runtime — never baked into Docker image layers. */
// Auth-only Firebase config — DEML stores no product data in Firebase.
const buildFirebaseConfig = (): Record<string, string> => ({
  apiKey: process.env['FIREBASE_API_KEY'] ?? 'PLACEHOLDER_API_KEY',
  authDomain: process.env['FIREBASE_AUTH_DOMAIN'] ?? 'demldotcom.firebaseapp.com',
  projectId: process.env['FIREBASE_PROJECT_ID'] ?? 'demldotcom',
  messagingSenderId: process.env['FIREBASE_MESSAGING_SENDER_ID'] ?? '870072971206',
  appId: process.env['FIREBASE_APP_ID'] ?? '1:870072971206:web:5231fde2822d750abfccc7',
});

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
const AUTH_STATUS_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://apis.google.com https://*.firebaseapp.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://backend.deml.app https://*.backend.deml.app",
  "frame-src 'self' https://*.firebaseapp.com",
  "frame-ancestors 'self' https://dataengineeringformachinelearning.com https://*.dataengineeringformachinelearning.com https://backend.deml.app https://*.backend.deml.app https://ui.dataengineeringformachinelearning.com http://localhost:* http://127.0.0.1:*",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

const withAuthStatusHeaders = (response: Response): Response => {
  const headers = new Headers(response.headers);
  headers.delete('x-frame-options');
  headers.set('Content-Security-Policy', AUTH_STATUS_CSP);
  headers.set('Cache-Control', 'no-store, no-transform');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const sendAuthStatusFallback = (res: express.Response, body: string): void => {
  res.status(200);
  res.removeHeader('X-Frame-Options');
  res
    .set('Content-Security-Policy', AUTH_STATUS_CSP)
    .set('Cache-Control', 'no-store, no-transform')
    .set('Referrer-Policy', 'strict-origin-when-cross-origin')
    .set('X-Content-Type-Options', 'nosniff')
    .send(body);
};
const angularApp = new AngularNodeAppEngine({
  // Railway + Cloudflare set X-Forwarded-* headers; trust them for SSR URL construction.
  trustProxyHeaders: ['x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto'],
});

/**
 * Global CORS Middleware
 * Required to handle OPTIONS preflight requests for cross-origin assets (e.g. module scripts)
 */
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-DEML-Session-Id');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
});

/**
 * Route /api/v1/* requests to the Django backend via proxy.
 * Resolves API calls during SSR and client-side requests using runtime BACKEND_URL.
 * Uses app.use (not a wildcard path param) so Angular's route extractor and
 * Express 5 / path-to-regexp v8 stay compatible during prerender builds.
 */
app.use('/api/v1', async (req, res) => {
  const rawBackendUrl = process.env['BACKEND_URL'] ?? '';
  if (!rawBackendUrl) {
    console.error('Proxy error: BACKEND_URL environment variable is not defined.');
    res.status(502).json({ error: 'Bad Gateway: BACKEND_URL is not configured' });
    return;
  }
  const backendBaseUrl = rawBackendUrl.replace(/\/+$/, '');
  const targetUrl = `${backendBaseUrl}${req.originalUrl}`;
  try {
    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, val]) => {
      if (val !== undefined) {
        if (Array.isArray(val)) {
          val.forEach(v => headers.append(key, v));
        } else {
          headers.set(key, val);
        }
      }
    });

    headers.delete('host');

    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : req;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: body as any,
      duplex: body ? 'half' : undefined,
    } as any);

    res.status(response.status);
    response.headers.forEach((val, key) => {
      res.set(key, val);
    });

    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    const sanitizedUrl = String(targetUrl).replace(/[\r\n]/g, '_');
    console.error('Proxy error for %s:', sanitizedUrl, err);
    res.status(502).json({ error: 'Bad Gateway via Frontend Proxy' });
  }
});

/**
 * Runtime Firebase config for the browser bundle (index.html loads /assets/firebase-config.js).
 * Must be registered before express.static so env vars are not replaced by build artifacts.
 */
app.get('/assets/firebase-config.js', (_req, res) => {
  res
    .type('application/javascript')
    .set('Cache-Control', 'no-store')
    .send(`window.FIREBASE_CONFIG = ${JSON.stringify(buildFirebaseConfig())};`);
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
    setHeaders: (res, _path, _stat) => {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-DEML-Session-Id');
    },
  }),
);

/**
 * Special handler for /auth-status to ensure 200 response for cross-domain iframe (used by marketing for auth state sharing).
 * Falls back to minimal HTML if Angular render fails.
 */
app.get('/auth-status', async (req, res) => {
  try {
    const response = await angularApp.handle(req);
    if (response) {
      writeResponseToNodeResponse(withAuthStatusHeaders(response), res);
    } else {
      sendAuthStatusFallback(
        res,
        '<!doctype html><html><head><title>Auth Status</title></head><body><div hidden>Auth status checker</div></body></html>',
      );
    }
  } catch {
    sendAuthStatusFallback(
      res,
      '<!doctype html><html><body><div hidden>Auth status</div></body></html>',
    );
  }
});

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then(response => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, error => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
