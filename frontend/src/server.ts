import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
const angularApp = new AngularNodeAppEngine();

/**
 * Global CORS Middleware
 * Required to handle OPTIONS preflight requests for cross-origin assets (e.g. module scripts)
 */
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
});

/**
 * Route /api/v1/* requests to the Django backend via proxy.
 * Resolves API calls during SSR and client-side requests using runtime BACKEND_URL.
 */
app.all('/api/v1/*', async (req, res) => {
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
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    },
  }),
);

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
