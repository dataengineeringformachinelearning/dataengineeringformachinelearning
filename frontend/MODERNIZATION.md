# DEML Frontend Modernization Plan

> Angular 22+ · Signals · Viking-UI · Cyber-Noir / Ocean Blue Serenity · mobile-first
> Constraint: all visual styling owns to `packages/viking-ui/` (THEME.md). App code never adds `styleUrl` / app-local SCSS.
> Note: DEML uses **Viking-UI**, not FORJD’s `forjd-ui`. Cloudscape-inspired shell patterns map to Viking layout recipes.

## Current baseline (2026-07-22)

| Area                                             | Grade | Notes                                                     |
| ------------------------------------------------ | :---: | --------------------------------------------------------- |
| Angular 22.0.8 standalone + lazy `loadComponent` |   A   | 0 NgModules                                               |
| Signals in services                              |  B+   | Auth/ML/settings already signal-based                     |
| Page state purity                                |  B−   | Hybrid class fields + `markForCheck`                      |
| Zoneless                                         |   A   | Explicit provider and zoneless Analog/Vitest TestBed      |
| `@defer`                                         |   C   | Analytics map and noncritical chrome defer below the fold |
| Viking layout consistency                        |   B   | Dashboard/analytics strong; public shells catching up     |
| App-local styles                                 |   A   | Zero component SCSS                                       |

## Target architecture

```
viking-app-layout
  ├─ sidebar → app-sidebar / viking-sidebar-nav
  ├─ content → viking-page-template (width/density by context)
  │              ├─ viking-page-header
  │              └─ viking-stack / viking-panel-grid / viking-form-grid / viking-section-template
  └─ footer / tools / flashbar as needed
```

**Density by context (THEME.md):**

| Route family             | Recipe                                                                          |
| ------------------------ | ------------------------------------------------------------------------------- |
| Dashboard / analytics    | `viking-page-template width="wide"` + `viking-panel-grid` + metric/chart panels |
| Explore                  | collection toolbar + `viking-panel-grid` of `viking-explore-card`               |
| Status / isolated-status | `viking-page-template` + status section primitives                              |
| Settings / account       | `viking-form-section` + `viking-form-grid` + `viking-field`                     |
| Auth / marketing shells  | `viking-page-shell` readable width                                              |

**State law:** every bindable value is a `signal` / `computed` / `input` / `model` / `output`. No `ChangeDetectorRef.markForCheck` on modernized surfaces. Prefer `toSignal` / `rxResource` over manual subscribe where practical.

**Tokens:** `--viking-bg`, `--viking-surface*`, `--viking-accent*`, `--viking-text*`, `--viking-border*`, `--viking-bp-*`, clamp typography via Viking type scale. Breakpoints: 375 base → `sm 600` → `md 768` → `sidebar 901` → `lg 1024` → `xl 1440`.

## Phased implementation order

### Phase 1 — Foundations (this tranche)

1. Remove `NgZone` from `LiveUpdatesService`; keep `updates$` for callers.
2. Migrate leaf components: `status-card`, `status-cta`, `pro-verified-badge` → `input()` + `computed`.
3. Signalize dashboard metrics; drop `cdr` from dashboard load path.
4. Add `@defer` for analytics geographic map and deferred chrome (issue reporter / command palette).
5. Align isolated-status shell to `viking-page-template`.
6. Harden `auth-status` (OnPush, `inject()`, drop empty `styles`).
7. Strip CSR leftovers (`ngSkipHydration`).
8. ~~Document and enable zoneless change detection.~~

### Phase 2 — Signal purity + zoneless

1. ~~Signalize analytics / settings~~ (done for `/dashboard`, `/analytics`, `/status`, `/settings`); account / vulnerabilities still hybrid.
2. ~~Replace live ticks with `latestEvent` effects~~ on dashboard + analytics (Django BFF SSE — not Firestore).
3. ~~Enable `provideZonelessChangeDetection()` and remove `zone.js` from runtime and test dependencies.~~
4. Convert remaining `@Input` / constructor DI.

### Phase 3 — Layout uniformity + mobile-first polish

1. Explore: drop custom `status-directory-grid` → `viking-panel-grid`.
2. Login / success / not-found → `viking-page-shell`.
3. Content-layout types (`dashboard` / `collection` / `form`) on authenticated routes.
4. Fluid type / touch targets audit via `check_mobile_first.js` + axe.

### Phase 4 — Bundle / PWA / SEO

1. Route-level Leaflet CSS (or dynamic import) so non-analytics routes don’t pay the cost.
2. `@defer` charts on analytics + dashboard performance tab.
3. Keep DIY SW or migrate to `@angular/service-worker` intentionally.
4. Deduplicate Title/Meta (prefer `PageMetaService` only).
5. Lighthouse CI budgets (perf ≥ 90, a11y ≥ 95, SEO ≥ 95 on key routes).

## Verification gates

```bash
# From repo root
node scripts/enforce-theme.js
node scripts/check_mobile_first.js
node scripts/run_axe.js

# Frontend
cd frontend
npm run lint
npm test
npm run test:viking-ui   # if package touched
npm run build

# Optional Lighthouse (local or CI)
npx lighthouse https://deml.app/dashboard --only-categories=performance,accessibility,seo --quiet
```

## Out of scope / non-goals

- Replacing Viking-UI with forjd-ui or third-party kits (Material, Bootstrap, etc.).
- Inventing app-local CSS or ad-hoc breakpoints.
- Fake telemetry — empty states remain honest when FORJD has no data.
