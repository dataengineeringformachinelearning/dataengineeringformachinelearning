# DEML Angular on Vercel (project: `deml`)

Primary host for `deml-frontend` is **Vercel** (CSR static export). Django BFF is on **Fly** (`deml-backend`; Railway standby only). FORJD (Fly) + Supabase own the data plane.

```text
Browser (Vercel deml.app)
  → DEML Django Fly (backend.deml.app)  Firebase JWT
    → FORJD (backend.forjd.co)          fjsvc_ service token
      → Supabase Postgres / Auth (FORJD platform)
```

The Angular app must **not** call FORJD or Supabase with Firebase end-user tokens.

## Project settings

| Setting          | Value                                      |
| ---------------- | ------------------------------------------ |
| Project name     | `deml`                                     |
| Framework Preset | Other                                      |
| Root Directory   | `frontend`                                 |
| Build Command    | `npm run build` (from `vercel.json`)       |
| Output Directory | `dist/frontend/browser`                    |
| Install Command  | `npm ci --legacy-peer-deps`                |
| Node.js          | **24.x** (`frontend/package.json` engines) |

## Environment variables (Production)

Set in Vercel → Project `deml` → Settings → Environment Variables:

| Variable                       | Example                                         | Required                                     |
| ------------------------------ | ----------------------------------------------- | -------------------------------------------- |
| `FRONTEND_URL`                 | `https://deml.app`                              | yes                                          |
| `BACKEND_URL`                  | `https://backend.deml.app`                      | yes                                          |
| `MARKETING_URL`                | `https://dataengineeringformachinelearning.com` | yes                                          |
| `FIREBASE_API_KEY`             | (Firebase web key)                              | yes                                          |
| `FIREBASE_PROJECT_ID`          | `demldotcom`                                    | yes                                          |
| `FIREBASE_APP_ID`              | `1:…:web:…`                                     | yes                                          |
| `FIREBASE_AUTH_DOMAIN`         | `demldotcom.firebaseapp.com`                    | yes                                          |
| `FIREBASE_STORAGE_BUCKET`      | `demldotcom.firebasestorage.app`                | yes                                          |
| `FIREBASE_MESSAGING_SENDER_ID` | `870072971206`                                  | yes                                          |
| `SANITY_PROJECT_ID`            | `hj5wtuct`                                      | optional                                     |
| `SANITY_DATASET`               | `production`                                    | optional                                     |
| `SENTRY_DSN`                   |                                                 | optional                                     |
| `FORJD_API_URL`                | `https://backend.forjd.co`                      | informational                                |
| `SUPABASE_URL`                 | `https://….supabase.co`                         | informational                                |
| `SUPABASE_ANON_KEY`            |                                                 | leave empty unless a client feature needs it |

`set-env.js` bakes these into `environment.ts` at build time (CSR has no runtime secret injection).

## Django CORS / CSRF

On `deml-backend`, include every browser origin:

```bash
# Production custom domain + Vercel previews as needed
railway variable set \
  CORS_ALLOWED_ORIGINS=https://deml.app,https://dataengineeringformachinelearning.com,https://deml.vercel.app \
  CSRF_TRUSTED_ORIGINS=https://deml.app,https://dataengineeringformachinelearning.com,https://deml.vercel.app \
  FRONTEND_URL=https://deml.app \
  --service deml-backend
```

Add Firebase Authorized Domains for `deml.app` and `*.vercel.app` if using previews.

## Deploy

```bash
# One-time
cd frontend
npx vercel link --project deml --yes
npx vercel env pull   # optional local mirror

# Production
npx vercel deploy --prod --yes
```

Or connect the GitHub repo in the Vercel dashboard with Root Directory `frontend` and project name `deml`.

## Local verify

```bash
cd frontend
npm ci --legacy-peer-deps
npm run build
npx serve dist/frontend/browser   # http://localhost:3000
```

Confirm `dist/frontend/browser/index.html` exists (CSR) and there is **no** `dist/frontend/server/`.

## PWA / performance

- Existing `public/service-worker.js` + `site.webmanifest` (unchanged UX)
- `vercel.json` sets long-cache headers for hashed assets; `no-cache` for `index.html` and the service worker
- `@vercel/analytics` + `@vercel/speed-insights` in `src/main.ts`

## Rollback

Keep Railway `deml-frontend` Dockerfile (nginx CSR) as a cold standby, or point DNS back to the previous host. Do not re-enable Angular SSR unless you restore `angular.json` `server` / `ssr` entries.
