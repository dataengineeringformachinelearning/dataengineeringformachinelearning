# Browser security: XSS and CSRF (DEML)

How the DEML user plane prevents cross-site request forgery and cross-site scripting.
Partner/data-plane details: [`FORJD_INTEGRATION.md`](./FORJD_INTEGRATION.md).
FORJD’s own model: FORJD repo `backend/docs/AUTH.md`.

## Threat split

| Threat   | What we prevent                                                                     | Primary control                                                                     |
| -------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **CSRF** | Malicious site triggers a state-changing request using the victim’s browser session | Prefer **non-cookie credentials** on writes; Django CSRF where cookies still matter |
| **XSS**  | Injected script runs in `deml.app` origin and steals tokens or acts as the user     | **CSP** + framework escaping + nosniff / frame controls                             |

## CSRF model

```text
Cookie/session form paths
  → django.middleware.csrf.CsrfViewMiddleware
  → CSRF_TRUSTED_ORIGINS allowlist

SPA (Angular) product API
  → Authorization: Bearer <Firebase ID token>
  → optional X-DEML-Session-Id (registry; not sole write authority)

Headless / automation
  → X-API-Key: deml_…  or  Authorization: Bearer deml_… / ApiKey deml_…

SOAR control (ack / retry)
  → csrf_exempt_require_header_auth
  → never cookie-only
```

Implementation:

- Middleware: `backend/config/settings.py` (`CsrfViewMiddleware`, `CSRF_TRUSTED_ORIGINS`)
- Shared gate: `backend/config/csrf_header_auth.py`
- SOAR adapters: `backend/forjd/views.py` (`playbook_action_*_proxy`)
- Policy: FORJD adapters require `firebase_token` or `deml_api_key` (`forjd/policy.py`) — session cookies alone do not authorize

## XSS model

| Layer                 | Location                                                                      |
| --------------------- | ----------------------------------------------------------------------------- |
| SPA (Vercel)          | `frontend/vercel.json` — site-wide CSP + hardening; stricter `/auth-status`   |
| SPA (nginx container) | `frontend/nginx.conf`                                                         |
| Marketing / UI docs   | `firebase.json` hosting headers                                               |
| Django HTML           | `config.csp_middleware.ContentSecurityPolicyMiddleware`                       |
| Django defaults       | `SECURE_CONTENT_TYPE_NOSNIFF`, `SECURE_BROWSER_XSS_FILTER`, `X_FRAME_OPTIONS` |

Angular template binding escapes by default. Prefer text binding over `innerHTML` for any user-controlled strings. Widget `innerHTML` is limited to fixed SVG/icon markup.

CSP currently allows `'unsafe-inline'` for third-party and bootstrap scripts; tightening to nonces is a future hardening step, not a substitute for output encoding.

## CSP deepenings (2026-07)

Enforced CSP across product (`frontend/vercel.json`, `frontend/nginx.conf`), marketing (`marketing/vercel.json`), Storybook heads (`packages/viking-ui/.storybook/*-head.html`), and Django HTML (`backend/config/csp_middleware.py`):

| Change                                                                                                                                                              | Status |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Remove `https://esm.sh` from `script-src` / `connect-src`                                                                                                           | Done   |
| Drop Algolia from `script-src` (keep `connect-src` API hosts)                                                                                                       | Done   |
| Pin `https://cdn.jsdelivr.net` (no `*.jsdelivr.net`)                                                                                                                | Done   |
| Narrow product/marketing `script-src` to explicit DEML hosts (`deml.app`, `backend.deml.app`, marketing apex); broader `connect-src` kept for previews              | Done   |
| Add Vercel Analytics hosts (`va.vercel-scripts.com`, `vitals.vercel-insights.com`) on product CSP                                                                   | Done   |
| Add `form-action 'self'`; product/marketing `frame-ancestors 'self'` (`/auth-status` keeps its cross-surface allowlist; Django HTML keeps `frame-ancestors 'none'`) | Done   |
| Django: no `'unsafe-eval'`; Storybook keeps `'unsafe-eval'` (required)                                                                                              | Done   |
| Permissions-Policy denies `payment` / `usb` / `bluetooth` (aligned)                                                                                                 | Done   |

**Residual risk:** `'unsafe-inline'` remains on `script-src` / `style-src` for bootstrap shells, analytics snippets, and Swagger. That weakens XSS containment until nonce/hash CSP is rolled out. Product browser Sentry/Rollbar DSNs in build-time env are public client tokens by design — not server secrets. Public Storybook hosting is retired (local/Chromatic only); Storybook heads must not embed GTM/Clarity/Sentry.

## Operator checks

See checklist section **E2** in [`PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md).
