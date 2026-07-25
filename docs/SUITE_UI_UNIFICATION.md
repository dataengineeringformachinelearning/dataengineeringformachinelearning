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

## Pass 1 — canonical tokens

| Artifact            | Path                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------ |
| **Source of truth** | `packages/viking-ui/src/tokens/suite-tokens.css`                                                       |
| Usage docs          | `packages/viking-ui/src/tokens/SUITE_TOKENS.md`                                                        |
| Built               | `packages/viking-ui/dist/suite-tokens.css` (also prepended into `design-tokens.css` / `viking-ui.css`) |
| FORJD vendor        | `frontend/libs/forjd-ui/src/lib/styles/suite-tokens.css` + `backend/static/suite-tokens.css`           |

Prefix: **`--suite-*`** (canonical). `--viking-*` and `--fj-*` are compatibility aliases in the same file.
Theme: **dark-first** void; light via `data-theme="light"` only.
Sync to FORJD (no npm style install): `cd frontend && npm run sync:suite`.

## Pass 2 — component libraries

| Artifact         | Path                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------ |
| **Owned chrome** | `packages/viking-ui/src/tokens/suite-components.css`                                 |
| Contracts        | `packages/viking-ui/src/tokens/SUITE_COMPONENTS.md`                                  |
| Built            | `packages/viking-ui/dist/suite-components.css` (also folded into viking CSS bundles) |
| FORJD vendor     | `frontend/libs/forjd-ui/src/lib/styles/suite-components.css` + `backend/static/`     |

Dual selectors (`.suite-*` / `.viking-*` / `.fj-*`) keep DEML Angular, FORJD Angular, Storybook, and backend HTML shells on one look.
Pattern: **headless behavior + owned suite classes**. forjd-ui selectors (`forjd-*`) mirror viking APIs (`viking-*`).
Load order: **suite-tokens → suite-components → suite-landing → app**.

## Pass 3 — product frontend lockstep

| Artifact          | Path                                                                              |
| ----------------- | --------------------------------------------------------------------------------- |
| **Landing stage** | `packages/viking-ui/src/tokens/suite-landing.css`                                 |
| Contracts         | `packages/viking-ui/src/tokens/SUITE_LANDING.md`                                  |
| deml.app          | `viking-app.css` includes suite bundle + `marketing-landing` / community surfaces |
| forjd.co          | Composition-only landing; no app `landing.scss`                                   |
| marketing `/`     | `landing-container` + suite hero/CTAs                                             |

Shared DNA: void atmosphere, electric command CTAs, brand → headline → lede → actions, section tags, suite cards.

## Pass 4 — backend surfaces

| Artifact          | Path                                                                 |
| ----------------- | -------------------------------------------------------------------- |
| **Backend stage** | `packages/viking-ui/src/tokens/suite-backend.css`                    |
| Contracts         | `packages/viking-ui/src/tokens/SUITE_BACKEND.md`                     |
| backend.forjd.co  | Splash + `/docs` / `/redoc` load suite-tokens → components → backend |
| backend.deml.app  | Splash + swagger/redoc via `viking-ui.css` (suite-backend folded in) |

Quiet twin: perfectly centered logo splash, thin docs topbar, no product marketing chrome.

## Pass 5 — component documentation Storybooks

| Artifact        | Path                                           |
| --------------- | ---------------------------------------------- |
| **Docs chrome** | `packages/viking-ui/src/tokens/suite-docs.css` |
| Contracts       | `packages/viking-ui/src/tokens/SUITE_DOCS.md`  |
| ui.deml.app     | `packages/viking-ui/.storybook`                |
| ui.forjd.co     | `forjd/frontend/.storybook`                    |

Shared taxonomy: `Foundation/*` + `Primitives/*`. DEML-only extensions under `Product/*`.
Both managers use suite dark branding. Story shells use `.suite-story-shell` dual-class frames.

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

1. **Token lock** — done (`suite-tokens.css`).
2. **Owned chrome CSS** — done (`suite-components.css`).
3. **forjd-ui full primitive set** — done (suite class adapters + Storybook).
4. **Frontend lockstep** — done (`suite-landing.css` on forjd.co / deml.app `/` / marketing `/`).
5. **Backend lockstep** — done (`suite-backend.css`).
6. **Storybook lockstep** — done (`suite-docs.css`, shared Foundation/Primitives taxonomy on ui.deml.app + ui.forjd.co).
7. **Purity / enforcement** — done (`npm run suite:purity` + `enforce-theme.js`; Chromatic + `npm run sync:suite` after suite edits).

## Pass 6 — cross-repo purity (done)

| Check                             | Result                                                                    |
| --------------------------------- | ------------------------------------------------------------------------- |
| Hard-coded retired cyan `#00b4ff` | Absent in source; local FORJD build inlines `#2176ff`                     |
| External UI style packages        | viking-ui `dependencies: {}`; forjd-ui only Angular peers + tslib         |
| One-off component SCSS            | Removed (`_typography.scss`, `status-list.scss` → suite CSS)              |
| Google Fonts CDN                  | Removed from DEML CSP (self-hosted Inter only)                            |
| Suite file lockstep               | `sync:suite` vendors tokens/components/landing/backend/docs + Inter faces |
| Gate                              | `npm run suite:purity` (DEML; compares sibling FORJD when present)        |

### Remaining differences (intentional)

| Surface difference                          | Why OK                                                                |
| ------------------------------------------- | --------------------------------------------------------------------- |
| Product names / logos                       | Brand marks may differ; chrome must not                               |
| DEML `Product/*` Storybook stories          | Charts, suite header, status cards — DEML product depth               |
| FORJD `Product/Panel` + `StatusList`        | Adapter demos; same suite classes                                     |
| Light `theme-color` on deml.app / marketing | Products that support light mode; dark default remains `#0a0a0a`      |
| Production deploy lag                       | Live forjd.co/backend may still show pre-suite cyan until next deploy |

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
