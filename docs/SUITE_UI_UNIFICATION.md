# Suite UI Unification Mandate

**Status:** Law for the multi-repo system (DEML + FORJD).
**Effective:** 2026-07-24
**Canonical visual SoT:** `packages/viking-ui/` → `@dataengineeringformachinelearning/viking-ui`

## Surfaces that must be visually identical

| Host                                                                                   | Repo surface                   | Chrome owner                         |
| -------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------ |
| [forjd.co](https://forjd.co)                                                           | FORJD Angular landing          | forjd-ui → suite tokens              |
| [backend.forjd.co](https://backend.forjd.co)                                           | FastAPI `/`, `/docs`, `/redoc` | suite tokens (no stock Swagger look) |
| [ui.forjd.co](https://ui.forjd.co)                                                     | forjd-ui Storybook             | forjd-ui → suite tokens              |
| [deml.app](https://deml.app)                                                           | Angular product                | viking-ui                            |
| [backend.deml.app](https://backend.deml.app)                                           | Django + Swagger               | synced viking-ui.css                 |
| [ui.deml.app](https://ui.deml.app)                                                     | Viking-UI Storybook            | viking-ui                            |
| [dataengineeringformachinelearning.com](https://dataengineeringformachinelearning.com) | Astro marketing                | synced viking-ui.css                 |

A user must not be able to tell which product surface they are on by chrome, buttons, cards, or typography. Product names and logos may differ; the design system must not.

## Target aesthetic (blend, do not invent)

Elevate existing strengths — no new primary brand hues:

| Ingredient                         | Keep / elevate                                                             |
| ---------------------------------- | -------------------------------------------------------------------------- |
| Old DEML marketing polish          | Section rhythm, machined cards, Inter, WCAG AA, component density          |
| forjd.co direction                 | Void-black austerity, industrial tracking, snappy motion, full-bleed power |
| SpaceX                             | Austere black, industrial type, sparse hierarchy                           |
| Palantir + Blueprint               | Precise, data-dense, operational                                           |
| Lockheed                           | Aerospace authority, severe geometry                                       |
| OpenAI                             | Clean modern high-tech restraint                                           |
| Sequoia + McKinsey                 | Quiet institutional power                                                  |
| Porsche                            | Luxury performance feel (tight tolerances, not ornament)                   |
| Material / Spartan / Flux / shadcn | Patterns and anatomy only — **own every class and CSS variable**           |

### Locked palette (existing hexes only)

| Role               | Value                             | Provenance                    |
| ------------------ | --------------------------------- | ----------------------------- |
| Void bg            | `#0a0a0a`                         | FORJD `--fj-bg`               |
| Surface            | `#111111`                         | FORJD `--fj-surface`          |
| Surface 2          | `#1a1a1a`                         | FORJD `--fj-surface-2`        |
| Elevated           | `#141414`                         | FORJD `--fj-surface-elevated` |
| Border             | `#222222` / `#333333`             | FORJD borders                 |
| Command primary    | `#2176ff`                         | DEML `--viking-electric-500`  |
| Primary hover      | `#4d94ff`                         | DEML `--viking-electric-400`  |
| Brand artwork navy | `#070c20`                         | DEML logos / favicons only    |
| Brand artwork blue | `#0078ff`                         | DEML logos / favicons only    |
| Institutional gold | `#d4af37`                         | FORJD `--fj-gold`             |
| Danger             | `#a83344`                         | DEML `--viking-crimson-500`   |
| Success            | `#2a9d8f`                         | DEML `--viking-green-500`     |
| Warning            | `#d69e2e`                         | DEML `--viking-amber-500`     |
| Text               | `#f5f5f5` / `#aaaaaa` / `#999999` | DEML white + metallic         |

**Deprecated as product primary:** FORJD operator cyan `#00b4ff` (landing/docs must map to electric `#2176ff`).

## Ownership law

1. **Styles are 100% owned.** Zero runtime dependency on external UI packages for visual look. Copy Spartan/helm/shadcn _patterns_; never ship their CSS or class contracts.
2. **Viking-UI is the canonical library.** Tokens, SCSS, Web Components, Angular wrappers, icons, and static bundles live in DEML `packages/viking-ui/`.
3. **forjd-ui is a thin adapter**, not a second design system. It must:
   - Resolve `--fj-*` to the same computed values as `--viking-*` (see `_suite-bridge.scss` / forjd `_tokens.scss`)
   - Mirror the Viking component API over time (`button`, `card`/`panel`, `field`, shells, …)
   - Add Storybook stories for every primitive
4. **Apps never own look.** FORJD `frontend/src/**` and DEML `frontend/`, `marketing/`, `backend/` may compose components and bind data only.
5. **Mobile-first, snappy, SaaS-grade.** Touch ≥ 44px; tokenized motion; prefer CSS over JS animation.

## Pass 1 — canonical tokens (locked 2026-07-25)

| Artifact            | Path                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| **Source of truth** | `packages/viking-ui/src/tokens/suite-tokens.css`                                                       |
| **Role A lock**     | `packages/viking-ui/src/tokens/suite-tokens.lock.json`                                                 |
| Usage docs          | `packages/viking-ui/src/tokens/SUITE_TOKENS.md`                                                        |
| Gate                | `npm run suite:tokens` (also invoked by `suite:purity`)                                                |
| Built               | `packages/viking-ui/dist/suite-tokens.css` (also prepended into `design-tokens.css` / `viking-ui.css`) |
| FORJD vendor        | `frontend/libs/forjd-ui/src/lib/styles/suite-tokens.css` + `backend/static/suite-tokens.css`           |

Prefix: **`--suite-*`** (canonical). `--viking-*` and `--fj-*` are compatibility aliases in the same file.
Theme: **dark-first** void; light via `data-theme="light"` only.
Roles: **A** chrome (locked) · **B** chart series · **C** PDF reports (out of product UI).
Sync to FORJD (no npm style install): `cd frontend && npm run sync:suite`.
Everything downstream consumes only these tokens — no hard-coded product colors/spacing outside the system.

## Pass 2 — component libraries (locked 2026-07-25)

| Artifact         | Path                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------ |
| **Owned chrome** | `packages/viking-ui/src/tokens/suite-components.css`                                 |
| Contracts        | `packages/viking-ui/src/tokens/SUITE_COMPONENTS.md`                                  |
| Gate             | `npm run suite:components` (also via `suite:purity`)                                 |
| Built            | `packages/viking-ui/dist/suite-components.css` (also folded into viking CSS bundles) |
| FORJD vendor     | `frontend/libs/forjd-ui/src/lib/styles/suite-components.css` + `backend/static/`     |

Dual selectors (`.suite-*` / `.viking-*` / `.fj-*`) keep DEML Angular, FORJD Angular, Storybook, and backend HTML shells on one look.
Pattern: **headless behavior + owned suite classes**. forjd-ui selectors (`forjd-*`) mirror viking APIs (`viking-*`); adapters apply triple classes.
Required primitives: button, input, textarea, select, checkbox, radio, switch, card, badge, dialog/sheet, tabs, table, nav, toast, skeleton, empty, avatar, separator, callout, progress, spinner, page shell.
Load order: **suite-tokens → suite-components → suite-landing → app**.
Aesthetic: SpaceX restraint · Palantir density · Porsche precision · Spartan/Flux composability — all token-only.

## Pass 3 — product frontend lockstep (locked 2026-07-25)

| Artifact          | Path                                                                          |
| ----------------- | ----------------------------------------------------------------------------- |
| **Landing stage** | `packages/viking-ui/src/tokens/suite-landing.css`                             |
| Contracts         | `packages/viking-ui/src/tokens/SUITE_LANDING.md`                              |
| Gate              | `npm run suite:landing` (also via `suite:purity`)                             |
| deml.app `/`      | `product-home` composition + suite classes; `viking-app.css`                  |
| forjd.co          | Composition-only `landing.html`; no app SCSS                                  |
| marketing `/`     | `index.astro` + suite stage; atmosphere not doubled by marketing-landing.scss |

Shared DNA: void atmosphere (electric + gold + grid), live badge, brand → headline → lede → suite-btn CTAs, mono section tags, steps / bands / grids, suite cards.

## Pass 4 — backend surfaces (locked 2026-07-25)

| Artifact          | Path                                                                         |
| ----------------- | ---------------------------------------------------------------------------- |
| **Backend stage** | `packages/viking-ui/src/tokens/suite-backend.css`                            |
| Contracts         | `packages/viking-ui/src/tokens/SUITE_BACKEND.md`                             |
| Gate              | `npm run suite:backend` (also via `suite:purity`)                            |
| backend.forjd.co  | suite-fonts → tokens → components → backend; Inter at `/static/fonts/inter/` |
| backend.deml.app  | Splash + swagger/redoc via `viking-ui.css` (suite-backend folded in)         |

Quiet twin: **perfectly centered** logo splash, sticky thin docs topbar, quiet Swagger chips, no marketing chrome. Same DNA as product — calmer and more focused.

## Pass 5 — component documentation Storybooks (locked 2026-07-25)

| Artifact        | Path                                                        |
| --------------- | ----------------------------------------------------------- |
| **Docs chrome** | `packages/viking-ui/src/tokens/suite-docs.css`              |
| Contracts       | `packages/viking-ui/src/tokens/SUITE_DOCS.md`               |
| Gate            | `npm run suite:docs` (also via `suite:purity`)              |
| ui.deml.app     | `packages/viking-ui/.storybook` — brand `Suite UI · Viking` |
| ui.forjd.co     | `forjd/frontend/.storybook` — brand `Suite UI · FORJD`      |

Shared taxonomy: `Foundation/*` + `Primitives/*`. DEML-only extensions under `Product/*`.
Both managers: void + electric (identical theme object).
Story frame: `.suite-story-shell` + `.suite-story-panel` (triple-classed) + fullscreen void backgrounds.

## Component API parity (Pass 2)

| Viking                   | forjd-ui                                                       | Chrome                              |
| ------------------------ | -------------------------------------------------------------- | ----------------------------------- |
| `viking-button`          | `forjd-button`                                                 | `.suite-btn` / `data-variant`       |
| `viking-input` / field   | `forjd-input`, `forjd-textarea`, `forjd-select`, `forjd-field` | `.suite-input` / `.suite-field`     |
| checkbox / switch        | `forjd-checkbox`, `forjd-switch`                               | `.suite-checkbox` / `.suite-switch` |
| `viking-card`            | `forjd-card`, `forjd-panel`                                    | `.suite-card`                       |
| badge / callout          | `forjd-badge`, `forjd-callout`                                 | `.suite-badge` / `.suite-callout`   |
| dialog / sheet           | `forjd-dialog`, `forjd-sheet`                                  | `.suite-dialog` / `.suite-sheet`    |
| tabs / table / nav       | `forjd-tabs`, `forjd-table`, `forjd-nav`                       | matching `.suite-*`                 |
| toast / skeleton / empty | `forjd-toast-host` + service, `forjd-skeleton`, `forjd-empty`  | matching `.suite-*`                 |
| avatar / separator       | `forjd-avatar`, `forjd-separator`                              | matching `.suite-*`                 |
| page shell               | `forjd-page-shell`, `forjd-section`, `forjd-stack`             | layout adapters                     |

Styles are **vendored** into FORJD (no npm theme package). Charts / metric-card remain DEML-first.

## Rollout phases

1. **Token lock** — done (`suite-tokens.css` + `suite-tokens.lock.json` + `suite:tokens` gate).
2. **Owned chrome CSS** — done (`suite-components.css` + triple-prefix + `suite:components` gate).
3. **forjd-ui full primitive set** — done (suite class adapters + Storybook; triple classes).
4. **Frontend lockstep** — done (`suite-landing.css` + triple hosts + `suite:landing` gate; vivid hero DNA).
5. **Backend lockstep** — done (`suite-backend.css` + fonts on FORJD backend + `suite:backend` gate).
6. **Storybook lockstep** — done (`suite-docs.css` + dual managers + shell/panel frame + `suite:docs` gate).
7. **Purity / enforcement** — done (`npm run suite:purity` + `enforce-theme.js`; Chromatic + `npm run sync:suite` after suite edits).

## Pass 6 — cross-repo purity (locked 2026-07-25)

| Check                             | Result                                                                    |
| --------------------------------- | ------------------------------------------------------------------------- |
| Hard-coded retired cyan `#00b4ff` | Absent in **source** (tests assert absence)                               |
| External UI style packages        | viking-ui `dependencies: {}`; forjd-ui only Angular peers + tslib         |
| One-off component SCSS            | Forbidden under deml pages / forjd app (gate fails if reintroduced)       |
| Google Fonts CDN                  | Banned by purity scan; self-hosted Inter only                             |
| Widget shadow tokens              | Void Role A + institutional gold (not legacy navy / `#c4a035`)            |
| Suite file lockstep               | `sync:suite` vendors tokens/components/landing/backend/docs + Inter faces |
| Gate                              | `npm run suite:purity` runs Pass 1–5 contracts + purity scan              |

**Full remaining-difference table + deploy debt:** [SUITE_PURITY.md](./SUITE_PURITY.md)

### Remaining differences (intentional)

| Surface difference                          | Why OK                                                               |
| ------------------------------------------- | -------------------------------------------------------------------- |
| Product names / logos                       | Brand marks may differ; chrome must not                              |
| DEML `Product/*` Storybook stories          | Charts, suite header, status cards — DEML product depth              |
| FORJD `Product/Panel` + `StatusList`        | Adapter demos; same suite classes                                    |
| Light `theme-color` on deml.app / marketing | Products that support light mode; dark default remains `#0a0a0a`     |
| Integration / Google logo brand hexes       | Third-party marks, not product chrome                                |
| Production deploy lag                       | Live backend.forjd.co may still show pre-suite cyan until Fly deploy |

## Verification

```bash
# DEML
npm run build:viking-ui:package
python scripts/sync_design_system.py
node scripts/enforce-theme.js
npm run suite:purity
npm run test:viking-ui
cd packages/viking-ui && npm run build-storybook

# FORJD
cd frontend && npm run sync:suite && npm run build && npm run build-storybook
# Visual (after deploy): forjd.co, backend.forjd.co/docs, ui.forjd.co vs deml.app / ui.deml.app / marketing
```

## Doc sync

When this mandate changes: update DEML `THEME.md`, `BOOK.md` Ch.32, `AGENTS.md`, `.cursorrules`, and FORJD `AGENTS.md`, `.cursorrules`, `ARCHITECTURE.md` (pointer), `frontend/libs/forjd-ui/README.md`.
