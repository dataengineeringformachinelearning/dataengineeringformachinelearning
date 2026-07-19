# DEML Design System — Viking-UI Theme

**Single source of truth** for visual design across all DEML surfaces:

| Property                                                                                      | Stack                          | Theme entry point                                               |
| --------------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------- |
| [dataengineeringformachinelearning.com](https://dataengineeringformachinelearning.com)        | Marketing (Astro)              | `/assets/viking-ui.css` + this document                         |
| [deml.app](https://deml.app)                                                                  | Angular SSR frontend           | `@dataengineeringformachinelearning/viking-ui` Angular wrappers |
| [backend.deml.app](https://backend.deml.app)                                                  | Django API + templates         | `backend/static/viking-ui.css`                                  |
| Swagger / OpenAPI UI                                                                          | Django Ninja docs              | Same tokens via static CSS                                      |
| Marketing site                                                                                | `marketing/`                   | `marketing/public/assets/viking-ui.css`                         |
| Docs, Book & Whitepaper                                                                       | Synced content + Drakkar shell | THEME.md tokens in prose and components                         |
| [ui.dataengineeringformachinelearning.com](https://ui.dataengineeringformachinelearning.com/) | Viking-UI component docs       | `deml-ui` (Firebase Hosting)                                    |

**Canonical implementation:** `packages/viking-ui/` (tokens, static CSS, Web Components, utility exports, package metadata, and Angular wrappers)
**Compiled artifacts:** `packages/viking-ui/dist/` (`design-tokens.css`, `viking-components.css`, `viking-ui.css`, `web-components.js`, `viking-ui-elements.js`, `icons.js`, `site-drakkar.js`, `widget.js`, `viking-tokens.json`)

## Viking-UI Styling Ownership Law

Viking-UI is the single source of truth for all DEML styling. Every visual rule used by the Angular frontend, Astro marketing site, Viking-UI docs, Django templates, Swagger, widgets, and future surfaces must originate in `packages/viking-ui/`.

- **Components first:** new UI must use existing `viking-*` components or Web Components before adding markup. If the primitive is missing, create it in `packages/viking-ui/src/web/` and, when Angular needs it, expose a thin wrapper in `packages/viking-ui/src/lib/`.
- **Tokens only:** every color, spacing, radius, shadow, font, motion, and data visualization value must resolve to a `--viking-*` token from `packages/viking-ui/src/styles/_variables.scss` or a semantic alias exported by the Viking-UI bundle.
- **No app-owned visuals:** `frontend/`, `marketing/`, `viking-ui-docs/`, Django templates, and widget consumers may compose Viking components, pass content/props, and load synced assets, but they must not define page-level SCSS/CSS, local `<style>` blocks, inline `style=""`, Tailwind utility styling, hardcoded palettes, or one-off visual class systems.
- **Extend, then consume:** when a consuming surface needs a new layout, card, CTA, legal/prose surface, nav/footer pattern, status display, chart treatment, or form pattern, add the primitive or surface style to `packages/viking-ui/src/styles/`, rebuild the package, and sync with `scripts/sync_design_system.py`.
- **Aesthetic changes are package changes:** every styling decision required by the final aesthetic below must be implemented inside `packages/viking-ui/` only, then consumed through public package entrypoints, synced artifacts, or CDN delivery. Do not implement aesthetic fixes directly in `frontend/`, `marketing/`, `viking-ui-docs/`, or `backend/`.
- **Generated assets are mirrors:** files such as `frontend/public/assets/viking-ui.css`, `marketing/public/assets/viking-ui.css`, `backend/static/viking-ui.css`, and `viking-ui-docs/public/assets/viking-ui.css` are compiled outputs. Do not hand-edit them except through the Viking-UI build and sync pipeline.

### Token artifacts (single source of truth)

| Artifact           | Path                                                                                  | Purpose                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| SCSS primitives    | `packages/viking-ui/src/styles/_variables.scss`                                       | All `--viking-*` values including surface recipes — edit here first                                          |
| Series palette     | `packages/viking-ui/src/styles/_series-colors.scss`                                   | Chart / picker series slots 1–8                                                                              |
| Legacy aliases     | `packages/viking-ui/src/styles/_legacy-aliases.scss`                                  | `--color-primary`, `--space-*`, Django/marketing compat                                                      |
| JSON export        | `packages/viking-ui/src/tokens/viking-tokens.json`                                    | Tooling, docs, design QA                                                                                     |
| Tailwind preset    | `packages/viking-ui/src/tokens/tailwind.preset.js`                                    | `theme.extend` → CSS variables                                                                               |
| TypeScript presets | `packages/viking-ui/src/tokens/series-presets.ts`                                     | `viking-color-picker` + chart bindings                                                                       |
| Static CSS bundle  | `packages/viking-ui/dist/design-tokens.css` / `packages/viking-ui/dist/viking-ui.css` | Non-Angular surfaces — build via `npm run build:viking-ui:package`, sync via `scripts/sync_design_system.py` |
| Utility subpaths   | `@dataengineeringformachinelearning/viking-ui/icons`, `/site-drakkar`, `/tokens.json` | Angular-free imports for Astro, static-site generation, nav/icon tooling                                     |

---

## Design philosophy

Viking-UI's current aesthetic is a **grid-first modern enterprise SaaS system**: highly consistent component anatomy, quiet Cyber-Noir surfaces, restrained Ocean Blue Serenity accents, balanced data density, and predictable responsive composition. The system should feel calm, precise, premium, and deliberately unsurprising across every product surface.

The concise component specification is maintained in
[BOOK.md § Appendix Y](BOOK.md#appendix-y-viking-ui-modern-saas-style-guide). Controls share
a 40px frame and 8px radius; content surfaces share a 12px radius; badges use a
24px pill frame; tables, charts, headers, and sidebars consume the same border,
hover, selected, focus, and elevation contracts.

High-quality references for primitive clarity, data density, and precision engineering inform the approach as directional quality bars only. Viking-UI does not import external UI libraries, copy source, duplicate visual systems, or move styling ownership out of `packages/viking-ui/`.

Directional references are [Material Design 3](https://m3.material.io/) for adaptive foundations, [Flux UI](https://fluxui.dev/) for composable layouts, [Spartan](https://spartan.ng/) for accessible Angular behavior, [shadcn/ui](https://ui.shadcn.com/) for component anatomy and reusable blocks, [Cloudscape](https://cloudscape.design/) for AWS-scale responsive operational patterns, and [Trust Controls](https://www.trustcontrols.ai/) for evidence-minded security governance. They inform contracts and testing, never runtime adoption or visual copying.

- **Precision engineering** — clean hierarchy, deterministic rhythm, high-contrast operational readability, and zero visual drift under pressure.
- **Boring consistency** — templates, grids, and semantic tokens make every route feel like one coherent enterprise product.
- **Dark-first command surfaces** — deep navy/charcoal backgrounds, machined metallic edges, no decorative noise.
- **Quiet surface depth** — crisp one-pixel borders, stepped surfaces, and soft low-elevation shadows distinguish hierarchy without visual noise.
- **Refined accent discipline** — restrained electric-teal (`#2176ff`) for command/confirmation, rich crimson for escalation, secondary emphasis, and danger; no neon gradients or ambient glow orbs on base surfaces.
- **Dense, breathable telemetry** — spacing is compact enough for operational dashboards and charts, but never cramped; semantic roles compose on a 4px primitive grid while stable numbered aliases retain compatibility.
- **Primitive clarity** — component language follows clean, composable primitive style: small accessible primitives, predictable APIs, and layout visible through structure rather than bespoke styling.
- **Geometric severity, not fantasy** — austere geometry, cold materiality, and sparse restraint appear as severe silhouettes and structural accents, never themed illustration, faux-medieval ornament, or decorative storytelling.
- **WCAG 2.1 AA** — contrast, focus rings, touch targets (44px mobile minimum), keyboard navigation.
- **Zero arbitrary hex** — all colors resolve to tokens below.

### Composable primitive model

[Viking-UI](https://github.com/dataengineeringformachinelearning/dataengineeringformachinelearning/tree/main/packages/viking-ui) follows a **composable primitive** model: consume package components and synced CSS from applications, and place all styling behavior in the package.

| Pattern                  | Viking-UI equivalent                                                   | Notes                                                                |
| ------------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Clean card surfaces      | `viking-card`, `viking-metric-card`, `viking-hud-panel`                | `--viking-shadow-sm`, `--viking-radius-lg`, no glass blur            |
| Form field stack         | `viking-field` → control (`viking-input`, `viking-select`, …)          | Label, description, error; shake on invalid                          |
| Button variants          | `viking-button` (`primary`, `secondary`, `outline`, `danger`, `ghost`) | Min 44px touch on mobile; semibold + wide tracking                   |
| Dark-first shell         | `data-theme="dark"` default                                            | Light mode shifts electric/crimson lightness only — no hue inversion |
| Accessible focus         | `--viking-ring` 2px + 2px offset                                       | Visible on keyboard; never remove for aesthetics                     |
| Settings / billing forms | `viking-form-section`, grouped fields                                  | Section titles at `--viking-font-size-lg`, 24px vertical rhythm      |
| Peer surface layout      | `viking-panel-grid`                                                    | Equal-height cards, HUD panels, and charts by construction           |
| Form field layout        | `viking-form-grid`                                                     | Top-align controls when label, helper, or error copy differs         |
| Vertical rhythm          | `viking-stack`                                                         | Separates consecutive blocks without app-specific sibling margins    |
| Section anatomy          | `viking-section-template`                                              | Reuses heading, description, actions, divider, and body rhythm       |
| Page composition         | `viking-page-shell`, `viking-section`, semantic layout recipes         | Responsive rhythm stays package-owned                                |

**Palette discipline:** **deep navy/black command surfaces, dark steel metallic borders, and restrained electric-teal/crimson battlefield accents** — luxurious, severe, and industrial, not startup-neutral. All styling resolves to **`--viking-*` tokens** inside Viking-UI so Django, Astro, Angular, docs, widgets, and Swagger share the same CSS variables without Tailwind runtime or platform-local stylesheets.

Choose layout primitives by intent. Peer operational surfaces use `viking-panel-grid`; related fields use `viking-form-grid`; consecutive blocks use `viking-stack`; repeated title/description/action/body anatomy uses `viking-section-template`. Use lower-level `viking-grid` only for content-led layouts or deliberately unequal 12-track regions. Consuming templates must not reproduce these guarantees with one-off classes, sibling margins, alignment overrides, minimum heights, or repeated section-header markup.

### Directional language

- The aesthetic emphasizes premium engineering confidence, austere geometry, clean primitive composition, dense operational data, and restrained tactical accents.
- Machined precision: clean seams, deterministic rhythm, machined hierarchy, and zero visual drift under stress.
- Geometric discipline: accents are strategic, not ornamental, and reserved for section boundaries, shell framing, chart emphasis, and critical-state callouts.
- Surfaces stay deeply navy/charcoal with **machined metallic borders**, consistent top-edge highlights, and stronger tactile depth on cards/buttons.
- Never soften the system into startup SaaS neutrality, fantasy theming, glassmorphism, neon cyberpunk, or cramped utilitarian austerity.
- Implement every visual adjustment inside `packages/viking-ui/`; consuming apps only compose primitives, bind data, and load package artifacts.

---

## 1. Color palette

### DEML brand identity colors

The immutable DEML mark uses a dedicated navy and blue pair. These literals are permitted only in portable brand artwork such as logos, favicons, application icons, and social-preview images; product UI must continue to consume semantic `--viking-*` tokens.

| Token                 | HEX       | RGB                | Role                                  |
| --------------------- | --------- | ------------------ | ------------------------------------- |
| `--viking-brand-navy` | `#070C20` | `rgb(7, 12, 32)`   | Brand-mark background                 |
| `--viking-brand-blue` | `#0078FF` | `rgb(0, 120, 255)` | Brand-mark foreground and recognition |

### 1.1 Deep navy / charcoal surfaces

Deep navy-black surfaces anchor every surface. The `--viking-charcoal-*` names remain as compatibility aliases over the navy scale; use stepped elevation, not arbitrary shades.

| Token                   | HEX       | RGB                | Role                               |
| ----------------------- | --------- | ------------------ | ---------------------------------- |
| `--viking-charcoal-950` | `#030818` | `rgb(3, 8, 24)`    | Deepest backdrop, modal scrim base |
| `--viking-charcoal-900` | `#0A1024` | `rgb(10, 16, 36)`  | Default page background (dark)     |
| `--viking-charcoal-800` | `#101B33` | `rgb(16, 27, 51)`  | Cards, panels, sidebars            |
| `--viking-charcoal-700` | `#162544` | `rgb(22, 37, 68)`  | Elevated surfaces, inputs          |
| `--viking-charcoal-600` | `#1E3054` | `rgb(30, 48, 84)`  | Raised chips, hover states         |
| `--viking-charcoal-500` | `#284068` | `rgb(40, 64, 104)` | Strong dividers (rare)             |

### 1.2 Metallic accents (borders & depth)

Machined aluminum feel with aerospace-grade trim — borders, axis lines, and defensive shell structure.

| Token                   | HEX       | RGB                  | Role                    |
| ----------------------- | --------- | -------------------- | ----------------------- |
| `--viking-metallic-600` | `#555555` | `rgb(85, 85, 85)`    | Border mix base         |
| `--viking-metallic-500` | `#666666` | `rgb(102, 102, 102)` | Muted text (light mode) |
| `--viking-metallic-400` | `#777777` | `rgb(119, 119, 119)` | Strong borders          |
| `--viking-metallic-300` | `#999999` | `rgb(153, 153, 153)` | Subtle labels           |
| `--viking-metallic-200` | `#AAAAAA` | `rgb(170, 170, 170)` | Muted text (dark mode)  |
| `--viking-metallic-100` | `#BBBBBB` | `rgb(187, 187, 187)` | Disabled shell trim     |

### 1.3 Primary — restrained electric-teal

Primary CTAs, links, focus rings, series 1 in charts.

| Token                   | HEX       | RGB                  | Role                                          |
| ----------------------- | --------- | -------------------- | --------------------------------------------- |
| `--viking-electric-700` | `#0A4FD4` | `rgb(10, 79, 212)`   | Active / pressed primary                      |
| `--viking-electric-600` | `#1565F0` | `rgb(21, 101, 240)`  | Primary (light mode)                          |
| `--viking-electric-500` | `#2176FF` | `rgb(33, 118, 255)`  | Primary (dark mode), **Series color default** |
| `--viking-electric-400` | `#4D94FF` | `rgb(77, 148, 255)`  | Focus ring, hover, strong accent              |
| `--viking-electric-300` | `#7AB0FF` | `rgb(122, 176, 255)` | Highlights (sparingly)                        |

Legacy `--viking-teal-*` aliases resolve to the electric-blue scale for backward compatibility; new component work should use semantic aliases such as `--viking-accent`, `--viking-ring`, and `--viking-text-link`.

### 1.4 Secondary — rich crimson

Secondary emphasis, destructive actions, critical series.

| Token                  | HEX       | RGB                | Role                     |
| ---------------------- | --------- | ------------------ | ------------------------ |
| `--viking-crimson-700` | `#7A2231` | `rgb(122, 34, 49)` | Secondary (light mode)   |
| `--viking-crimson-600` | `#922B3E` | `rgb(146, 43, 62)` | Secondary (dark mode)    |
| `--viking-crimson-500` | `#A83344` | `rgb(168, 51, 68)` | Danger default, series 5 |
| `--viking-crimson-400` | `#C44355` | `rgb(196, 67, 85)` | Danger text (dark)       |

### 1.5 Semantic status

| Token                | HEX       | RGB                 | Role                                     |
| -------------------- | --------- | ------------------- | ---------------------------------------- |
| `--viking-green-500` | `#2A9D8F` | `rgb(42, 157, 143)` | Success, stable, series 3                |
| `--viking-gold-500`  | `#C4A035` | `rgb(196, 160, 53)` | Warning, series 4                        |
| `--viking-blue-500`  | `#4D94FF` | `rgb(77, 148, 255)` | Info, series 6 (`--viking-electric-400`) |

### 1.6 Absolute neutrals

| Token                 | HEX       | RGB                  | Role                     |
| --------------------- | --------- | -------------------- | ------------------------ |
| `--viking-white`      | `#F5F5F5` | `rgb(245, 245, 245)` | Primary text on dark     |
| `--viking-white-pure` | `#FFFFFF` | `rgb(255, 255, 255)` | On-accent text, light bg |
| `--viking-black`      | `#000000` | `rgb(0, 0, 0)`       | Overlays (rare)          |

### 1.7 Semantic aliases (mode-aware)

These map to primitives above. **Always prefer aliases in components.**

```css
/* Surfaces */
--viking-bg              /* page background */
--viking-surface         /* card / panel */
--viking-surface-alt     /* inset wells */
--viking-surface-raised  /* chips, elevated controls */
--viking-surface-muted   /* disabled / inactive surface */
--viking-surface-control /* input / select background */
--viking-surface-header  /* header / toolbar background */

/* Text */
--viking-text            /* primary copy */
--viking-text-muted      /* secondary copy */
--viking-text-subtle     /* placeholders, axis hints */
--viking-text-inverted   /* text on accent fills */

/* Borders */
--viking-border          /* default 1px dividers */
--viking-border-strong   /* emphasis borders */
--viking-border-subtle   /* hairlines */

/* Accents */
--viking-accent                  /* primary CTA */
--viking-accent-hover
--viking-accent-content
--viking-accent-soft             /* tinted backgrounds */
--viking-accent-strong
--viking-accent-secondary        /* crimson emphasis */
--viking-accent-secondary-hover
--viking-accent-secondary-content
--viking-accent-secondary-soft

/* Status */
--viking-success
--viking-warning
--viking-danger
--viking-info
--viking-danger-text
--viking-on-danger

/* Focus */
--viking-ring
--viking-ring-width: 2px
--viking-ring-offset: 2px

/* Overlay */
--viking-overlay-backdrop
```

### 1.8 Legacy DEML aliases (Angular app compatibility)

Parent apps may still expose these; Viking-UI maps them in `viking-ui.scss`:

| Legacy             | Viking token               |
| ------------------ | -------------------------- |
| `--color-primary`  | `--viking-electric-600`    |
| `--accent-color`   | `--viking-crimson-600`     |
| `--bg-color`       | `--viking-bg`              |
| `--text-color`     | `--viking-text`            |
| `--card-bg`        | `--viking-surface`         |
| `--base-font-size` | `16px` floor               |
| `--ui-font-size`   | `14px` Drakkar shell floor |

### 1.9 Series color slots (charts & pickers)

Programmatic series colors map to fixed tokens — use these instead of raw hex in chart code.

| Slot | Token               | HEX       | Role                 |
| ---- | ------------------- | --------- | -------------------- |
| 1    | `--viking-series-1` | `#2176FF` | Primary / default    |
| 2    | `--viking-series-2` | `#922B3E` | Secondary comparison |
| 3    | `--viking-series-3` | `#2A9D8F` | Success / stable     |
| 4    | `--viking-series-4` | `#C4A035` | Warning / threshold  |
| 5    | `--viking-series-5` | `#A83344` | Critical / anomaly   |
| 6    | `--viking-series-6` | `#4D94FF` | Info / auxiliary     |
| 7    | `--viking-series-7` | `#162544` | Baseline / muted     |
| 8    | `--viking-series-8` | `#666666` | Disabled / archived  |

Default selection: `--viking-series-default` → `--viking-series-1`.

---

## 2. Typography

Inter is the **primary typeface** for every DEML surface. The variable font is **self-hosted** (`InterVariable.woff2`) for performance, privacy, and CSP simplicity — no Google Fonts CDN requests.

### 2.1 Font families

| Token                       | Stack                                                                                                       | Usage                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `--viking-font-family`      | `'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` | Body, UI chrome, headings, tables, forms, Swagger                  |
| `--viking-font-family-mono` | `ui-monospace, 'JetBrains Mono', 'SF Mono', 'Cascadia Code', Consolas, monospace`                           | Code blocks, hex values, telemetry IDs, kbd                        |
| `.viking-font-display`      | Inter bold caps (`--viking-letter-spacing-caps`)                                                            | Section tags, instrument labels, KPI badges, CES/marketing display |

**Self-hosting:**

| Asset                        | Canonical source                             | Deployed paths                                                                     |
| ---------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------- |
| `InterVariable.woff2`        | `packages/viking-ui/src/assets/fonts/inter/` | `*/assets/fonts/inter/` (frontend, marketing, docs), `backend/static/fonts/inter/` |
| `InterVariable-Italic.woff2` | Same                                         | Same                                                                               |
| `@font-face` declarations    | `packages/viking-ui/src/styles/_fonts.scss`  | Compiled into `viking-ui.css` on every surface                                     |

Sync fonts after changes: `python scripts/sync_fonts.py` (also runs inside `scripts/sync_design_system.py`).

**Preload** (optional, recommended on login/marketing shells):

```html
<link
  rel="preload"
  href="/assets/fonts/inter/InterVariable.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
```

### 2.2 Weights & optical sizing

Inter variable font supports **100–900** continuously. Use tokenized weights — do not load discrete font files.

| Token                           | Value | Typical use                                    |
| ------------------------------- | ----- | ---------------------------------------------- |
| `--viking-font-weight-regular`  | 400   | Body copy, descriptions, chart axis labels     |
| `--viking-font-weight-medium`   | 500   | Nav items, table headers, inline links         |
| `--viking-font-weight-semibold` | 600   | Section headings (h2–h4), card titles, buttons |
| `--viking-font-weight-bold`     | 700   | Page titles (h1), KPI values, emphasis metrics |

Apply `font-optical-sizing: auto` on `html` (set in `_typography.scss`). Metrics and KPIs add `.viking-tabular-nums` (`font-variant-numeric: tabular-nums lining-nums`).

### 2.3 Type scale

| Token                         | Size | Typical use              |
| ----------------------------- | ---- | ------------------------ |
| `--viking-font-size-2xs`      | 11px | Legal micro-copy (avoid) |
| `--viking-font-size-xs`       | 12px | Chart axis, badges       |
| `--viking-font-size-sm`       | 14px | Buttons, labels, nav     |
| `--viking-font-size` / `base` | 16px | Body text                |
| `--viking-font-size-md`       | 18px | Lead paragraphs          |
| `--viking-font-size-lg`       | 20px | Section titles           |
| `--viking-font-size-xl`       | 24px | Page headings            |
| `--viking-type-heading-lg`    | 24px | Alias for page headings  |
| `--viking-font-size-2xl`      | 30px | Hero subheads            |
| `--viking-font-size-3xl`      | 36px | Marketing hero           |
| `--viking-font-size-4xl`      | 48px | Display (marketing only) |

### 2.4 Line height by element

| Element / context        | Token / value                          | Notes                                    |
| ------------------------ | -------------------------------------- | ---------------------------------------- |
| Body (`p`, prose)        | `--viking-line-height-relaxed` (1.625) | Default for long-form readability        |
| UI controls, nav, tables | `--viking-line-height-normal` (1.5)    | Compact chrome                           |
| Headings h1–h3           | `--viking-line-height-tight` (1.25)    | Pair with negative letter-spacing        |
| Buttons, badges, chips   | `--viking-line-height-snug` (1.375)    | Single-line controls                     |
| Chart axis labels        | `--viking-line-height-tight` (1.25)    | At `--viking-chart-axis-size` (12px min) |
| Code blocks              | `--viking-line-height-relaxed` (1.625) | Use `--viking-font-family-mono`          |

| Token                          | Value |
| ------------------------------ | ----- |
| `--viking-line-height-tight`   | 1.25  |
| `--viking-line-height-snug`    | 1.375 |
| `--viking-line-height-normal`  | 1.5   |
| `--viking-line-height-relaxed` | 1.625 |
| `--viking-line-height-loose`   | 1.75  |

### 2.5 Letter spacing

| Token                             | Value   | Usage                                    |
| --------------------------------- | ------- | ---------------------------------------- |
| `--viking-letter-spacing-tighter` | -0.03em | h1, hero display                         |
| `--viking-letter-spacing-tight`   | -0.02em | h2–h6, card titles                       |
| `--viking-letter-spacing-normal`  | 0       | Body copy                                |
| `--viking-letter-spacing-wide`    | 0.025em | Subtle label emphasis                    |
| `--viking-letter-spacing-wider`   | 0.05em  | h3 uppercase treatment                   |
| `--viking-letter-spacing-caps`    | 0.08em  | `.viking-font-display` only — never body |

### 2.6 Rules

- **16px minimum** for main content (`--viking-font-size` / `--base-font-size`).
- **14px minimum** for Drakkar shell controls (`--viking-font-size-sm` / `--ui-font-size`).
- **Never** load Inter from Google Fonts or other CDNs in production — use `_fonts.scss`.
- **Never** hardcode `font-family: 'Inter'` in components — use `var(--viking-font-family)`.
- Headings use `--viking-letter-spacing-tight` or `--viking-letter-spacing-tighter`.
- Instrument / badge caps use `.viking-font-display` or `--viking-letter-spacing-caps` — never on body copy.
- Metrics and KPIs: `--viking-font-weight-semibold` or `--viking-font-weight-bold` + `.viking-tabular-nums`.

---

## 3. Spacing (4px primitive grid, stable compatibility scale)

Existing numbered `--viking-space-*` tokens retain their public 8px progression for compatibility. New components use semantic spacing roles built from the 4px primitive grid: `--viking-space-control-gap`, `--viking-space-content-gap`, `--viking-space-container-gap`, `--viking-space-section-gap`, and `--viking-space-page-gap`. Hairlines use `--viking-space-px` (1px) and never participate in layout.

**Rules:**

- Prefer `var(--viking-space-1)` … `var(--viking-space-12)` (and larger documented steps). Never invent `13px` / `18px` / `27px`.
- Outer page gutters: `--viking-page-gutter` (`space-2` → `space-4` clamp).
- Card interior: `--viking-card-padding` (24px); compact tiles use `--viking-card-padding-compact` (16px).
- Card content gap: `--viking-card-content-gap` (24px) — consistent between Angular and static card primitives.
- Form field stack: `--viking-space-3` between sections; `--viking-space-1` between label and control.
- Button groups / chips: `--viking-space-2` gap.
- Section breaks: `--viking-page-section-gap` (64px), with 32px internal section rhythm.
- Deprecated half-steps (`--viking-space-1-5`, `--viking-space-2-5`, `--viking-space-half`) **alias** onto on-grid tokens — do not introduce new half-step usages.
- Dense but breathable: use `.viking-stack` / `.viking-grid` utilities for rhythm. Cards and sections should separate clearly without sparseness.

| Token                | Value | Role                            |
| -------------------- | ----- | ------------------------------- |
| `--viking-space-0`   | 0     | Reset                           |
| `--viking-space-px`  | 1px   | Hairline only                   |
| `--viking-space-0-5` | 4px   | Tight-only exception            |
| `--viking-space-1`   | 8px   | Inline gaps, label → control    |
| `--viking-space-2`   | 16px  | Control groups, default stack   |
| `--viking-space-3`   | 24px  | Form sections                   |
| `--viking-space-4`   | 32px  | Compact card padding            |
| `--viking-space-5`   | 40px  | Default card / panel padding    |
| `--viking-space-6`   | 48px  | Page stack gap                  |
| `--viking-space-7`   | 56px  | Large gutter                    |
| `--viking-space-8`   | 64px  | Section padding / navbar height |
| `--viking-space-9`   | 80px  | Shell / marketing tier          |
| `--viking-space-10`  | 96px  | Large section break             |
| `--viking-space-11`  | 112px | XL shell                        |
| `--viking-space-12`  | 128px | 2× sidebar unit                 |
| `--viking-space-14`  | 160px | XXL                             |
| `--viking-space-16`  | 192px | Hero / wide shell               |
| `--viking-space-20`  | 256px | Sidebar width scale             |
| `--viking-space-24`  | 320px | Max shell                       |

Steps through `8` are consecutive **+8px**. Larger steps remain **multiples of 8** as named tiers (not every intermediate 8px slot is named).

**Deprecated aliases (do not use in new code):**

| Alias                 | Resolves to          |
| --------------------- | -------------------- |
| `--viking-space-half` | `--viking-space-0-5` |
| `--viking-space-1-5`  | `--viking-space-2`   |
| `--viking-space-2-5`  | `--viking-space-2`   |
| `--viking-space-8-5`  | 72px (prefer 8 or 9) |

**Layout constants:**

| Token                                 | Value                                        |
| ------------------------------------- | -------------------------------------------- |
| `--viking-container-max-width`        | 1260px (`.page-inner-wrapper`)               |
| `--viking-container-wide-max-width`   | 1440px (`viking-page-template width="wide"`) |
| `--viking-page-gutter`                | clamp(`space-2`, 5vw, `space-4`)             |
| `--viking-page-gutter-lg`             | `--viking-space-5`                           |
| `--viking-page-stack-gap`             | 32px                                         |
| `--viking-page-section-gap`           | 64px                                         |
| `--viking-card-padding`               | 24px                                         |
| `--viking-card-padding-compact`       | 16px                                         |
| `--viking-card-content-gap`           | 24px                                         |
| `--viking-panel-padding`              | 24px                                         |
| `--viking-form-max-width`             | 42rem                                        |
| `--viking-form-narrow-max-width`      | 28rem                                        |
| `--viking-content-readable-max-width` | 48rem                                        |
| `--viking-navbar-height`              | `--viking-space-8` (64px)                    |
| `--viking-sidebar-width`              | 256px (32 × 8px)                             |
| `--viking-control-height`             | 40px desktop / ≥44px mobile (touch)          |
| `--viking-control-height-sm`          | 32px                                         |
| `--viking-control-height-xs`          | 24px                                         |
| `--viking-control-padding-x`          | `--viking-space-2`                           |
| `--viking-btn-min-width`              | 120px                                        |

**Site navbar (`static-navbar.scss`):** `.navbar-content` is capped at `--viking-container-max-width` (1260px) and centered. The bar uses `container-name: viking-navbar` for responsive nav-label compaction. Desktop nav (`.desktop-nav`) must render `display: flex` from `768px+`; search trigger and utility buttons stay vertically centered at `--viking-control-height`.

**Mobile-first + Grid foundation:** All layouts start as single-column grid (`grid-template-columns: 1fr`). Use `.viking-grid`, `.viking-grid--2` / `--3` / `--4`, and `.viking-stack` for predictable rhythm on the **8px** primary grid. Scale columns at 768px (tablet) and 1024px (desktop). Avoid deep flex nesting in favor of CSS Grid for alignment.

---

## 4. Border radius

Softer, more modern premium feel: favor 12–16px for cards and containers for a less harsh, more approachable machined aesthetic while retaining precision. Use smaller for controls.

| Token                  | Value | Use                            |
| ---------------------- | ----- | ------------------------------ |
| `--viking-radius-xs`   | 4px   | Kbd, micro chips               |
| `--viking-radius-sm`   | 6px   | Inputs (compact)               |
| `--viking-radius`      | 8px   | Buttons, swatches              |
| `--viking-radius-md`   | 10px  | Modals (inner)                 |
| `--viking-radius-lg`   | 12px  | Smaller cards, dense panels    |
| `--viking-radius-xl`   | 16px  | Main cards, panels, containers |
| `--viking-radius-2xl`  | 24px  | Hero/feature cards (marketing) |
| `--viking-radius-pill` | 999px | Badges, pills                  |

**Recommendation:** Primary cards and panels use `--viking-card-radius` (12px). Buttons use `--viking-button-radius` (8px). Reserve 16px for large overlays and 24px for exceptional marketing features.

---

## 5. Shadows & elevation

Soft neutral shadows with restrained falloff support stepped surfaces and one-pixel borders. No colored glows or deep floating cards. Elevation communicates hierarchy; interactive cards lift by at most 1px.

| Token                   | Recipe                                                           |
| ----------------------- | ---------------------------------------------------------------- |
| `--viking-shadow-xs`    | `0 1px 2px rgba(0,0,0,0.2)`                                      |
| `--viking-shadow-sm`    | `0 1px 2px …, 0 1px 3px …, inset 0 1px 0 rgba(255,255,255,0.04)` |
| `--viking-shadow-md`    | Layered drop + `inset 0 1px 0 rgba(255,255,255,0.05)`            |
| `--viking-shadow-lg`    | Deep panel elevation                                             |
| `--viking-shadow-inner` | `inset 0 1px 2px rgba(0,0,0,0.14)`                               |
| `--viking-shadow-hover` | Lift on interactive cards                                        |

Light mode uses lower-contrast shadows (charcoal at 6–10% alpha).

---

## 6. Motion & transitions

**Mechanical** motion: fast enough to feel responsive, slow enough to read state changes. Default 250ms; never bounce or elastic easing on data surfaces.

| Token                             | Value                                               |
| --------------------------------- | --------------------------------------------------- |
| `--viking-ease-default`           | `cubic-bezier(0.4, 0, 0.2, 1)`                      |
| `--viking-ease-in`                | `cubic-bezier(0.4, 0, 1, 1)`                        |
| `--viking-ease-out`               | `cubic-bezier(0, 0, 0.2, 1)`                        |
| `--viking-duration-fast`          | 150ms                                               |
| `--viking-duration`               | 250ms                                               |
| `--viking-duration-slow`          | 350ms                                               |
| `--viking-transition-colors`      | color, background, border, box-shadow, fill, stroke |
| `--viking-transition-interactive` | colors + transform + opacity                        |

**Rules:**

- Theme switches animate via `--viking-transition-colors` on `html`, `body`, and surface components.
- Respect `prefers-reduced-motion: reduce` — disable non-essential animation.
- Hover lift: `translateY(var(--viking-state-hover-lift))` = `-1px` max.
- Active press: `scale(var(--viking-state-active-scale))` = `0.985`.

---

## 7. Dark mode & light mode

### 7.1 Activation

```html
<html data-theme="dark">
  <!-- default; dark-first -->
  <html data-theme="light"></html>
</html>
```

If `data-theme` is omitted, `prefers-color-scheme` selects the palette.

### 7.2 Dark mode (default)

| Role             | Maps to                 |
| ---------------- | ----------------------- |
| Background       | `--viking-charcoal-900` |
| Surface          | `--viking-charcoal-800` |
| Text             | `--viking-white`        |
| Muted text       | `--viking-metallic-200` |
| Primary accent   | `--viking-electric-500` |
| Secondary accent | `--viking-crimson-600`  |
| Focus ring       | `--viking-electric-400` |

### 7.3 Light mode

| Role             | Maps to                               |
| ---------------- | ------------------------------------- |
| Background       | `--viking-white-pure`                 |
| Surface          | `--viking-white-pure` / `#F7F7F7` alt |
| Text             | `--viking-charcoal-900`               |
| Muted text       | `--viking-metallic-500`               |
| Primary accent   | `--viking-electric-600`               |
| Secondary accent | `--viking-crimson-700`                |
| Focus ring       | `--viking-electric-500`               |

### 7.4 Dark mode rules

- **Do** keep surfaces within the charcoal scale; increase elevation by stepping token, not opacity stacks.
- **Do** use `color-mix(in srgb, …)` for borders — never raw semi-transparent hex literals.
- **Do** maintain 4.5:1 contrast for body text, 3:1 for large text and UI components.
- **Don't** use pure `#000` page backgrounds (use `--viking-charcoal-900`).
- **Don't** invert accent hues between modes — only shift lightness (electric-500 ↔ electric-600).
- **Don't** add gradient orbs, mesh backgrounds, or neon glow on base layouts (CES gauges may use controlled glow on needles only).

---

## 8. Component standards

### 8.1 Buttons (`viking-button`)

| Variant              | Surface                     | Border                   | Text                                |
| -------------------- | --------------------------- | ------------------------ | ----------------------------------- |
| `primary` / `filled` | `--viking-accent`           | transparent              | `--viking-accent-content`           |
| `secondary`          | `--viking-accent-secondary` | transparent              | `--viking-accent-secondary-content` |
| `outline` (default)  | `--viking-surface`          | `--viking-border-strong` | `--viking-text`                     |
| `danger`             | `--viking-danger`           | transparent              | `--viking-on-danger`                |
| `ghost` / `subtle`   | transparent                 | transparent              | `--viking-text` / muted             |

- Min height: `--viking-control-height`; min width: `--viking-btn-min-width` (except icon-only / full-width).
- Focus: `--viking-ring` outline, 2px + 2px offset.
- Disabled: `--viking-state-disabled-opacity` (0.48).

### 8.2 Cards (`viking-card`)

- Background: `--viking-surface`; border: `--viking-border`; radius: `--viking-radius-lg` (12px).
- Shadow: `--viking-shadow-sm` (clean drop shadow + subtle inset top highlight for machined depth).
- Padding: `--viking-card-padding` (compact: `--viking-card-padding-compact`); content gap: `--viking-card-content-gap` (24px).
- Interactive cards: hover border `--viking-accent-strong`, `--viking-shadow-hover`, 1px lift.

### 8.3 Icons & SVGs (`viking-icon`)

| Preset | Size                           | Stroke |
| ------ | ------------------------------ | ------ |
| `sm`   | 16px (`--viking-icon-size-sm`) | 1.5    |
| `md`   | 20px                           | 1.75   |
| `lg`   | 24px                           | 1.75   |

- Colors: semantic tones (`accent`, `success`, `warning`, `danger`, `muted`) → CSS variables only.
- Brand marks: `drakkar`, `drakkar-compact`, `drakkar-lockup` (Viking-UI / Drakkar shell) and `deml`, `deml-compact`, `deml-lockup` (DEML product) — use `color="accent"`; never recolor SVG paths manually.
- Charts and gauges: native SVG, `viewBox` + `preserveAspectRatio`; no third-party chart libraries.

### 8.4 Series color (`viking-color-picker`)

The **Series color** control assigns colors to telemetry series, chart lines, and dashboard accents. Presets are fixed to the premium palette below — **do not add off-palette swatches**.

Each preset maps to a `--viking-series-N` token (§1.9). Import shared values from `series-presets.ts` or `viking-tokens.json` — never duplicate hex arrays in app code.

#### Preset swatches (default order)

| #   | HEX       | Token / role            | Use                                    |
| --- | --------- | ----------------------- | -------------------------------------- |
| 1   | `#2176FF` | `--viking-electric-500` | Primary series, default selection      |
| 2   | `#922B3E` | `--viking-crimson-600`  | Secondary / comparison series          |
| 3   | `#2A9D8F` | `--viking-green-500`    | Success / stable metrics               |
| 4   | `#C4A035` | `--viking-gold-500`     | Warning / threshold proximity          |
| 5   | `#A83344` | `--viking-crimson-500`  | Critical / anomaly series              |
| 6   | `#4D94FF` | `--viking-blue-500`     | Info / auxiliary series (electric-400) |
| 7   | `#162544` | `--viking-charcoal-700` | Baseline / muted series                |
| 8   | `#666666` | `--viking-metallic-500` | Disabled / archived series             |

**Default value:** `#2176FF` (`--viking-electric-500`)

**Implementation reference:**

```typescript
// packages/viking-ui/src/tokens/series-presets.ts
export const VIKING_SERIES_PRESETS = [
  "#2176ff",
  "#922b3e",
  "#2a9d8f",
  "#c4a035",
  "#a83344",
  "#4d94ff",
  "#162544",
  "#666666",
] as const;
export const VIKING_SERIES_DEFAULT = VIKING_SERIES_PRESETS[0];
```

```typescript
// packages/viking-ui/src/lib/color-picker/color-picker.ts
import { VIKING_SERIES_DEFAULT, VIKING_SERIES_PRESETS } from '@dataengineeringformachinelearning/viking-ui/agnostic/series-presets';
readonly presets = input<string[]>([...VIKING_SERIES_PRESETS]);
readonly value = model<string>(VIKING_SERIES_DEFAULT);
```

**Showcase usage:**

```html
<viking-field
  label="Series color"
  description="Presets are the THEME.md premium palette."
>
  <viking-color-picker />
</viking-field>
```

Custom colors via the native `<input type="color">` are allowed for power users but should be validated against brand guidelines in production UIs.

### 8.5 Charts (`viking-chart`, `viking-chart-panel`, uptime history)

Zero-dependency native SVG charts. Unified visual language across line/area/bar/donut/sparkline + uptime timelines. Reference aesthetic: clean, modern, well-spaced.

Map series tones to semantic tokens — never raw hex in chart code.

| Tone      | CSS variable               | Default series slot |
| --------- | -------------------------- | ------------------- |
| `accent`  | `var(--viking-accent)`     | Series 1            |
| `success` | `var(--viking-success)`    | Series 3            |
| `warning` | `var(--viking-warning)`    | Series 4            |
| `danger`  | `var(--viking-danger)`     | Series 5            |
| `muted`   | `var(--viking-text-muted)` | Baseline            |

| Chart element    | Token / behavior                                                                |
| ---------------- | ------------------------------------------------------------------------------- |
| Grid lines       | `--viking-chart-grid-stroke` (subtle dashed ~32% mix), width 0.75               |
| Axis + ticks     | `--viking-chart-axis-color` (text-subtle), `--viking-chart-axis-size` (11–12px) |
| Lines            | `--viking-chart-line-width` (2.25 base / 2.5 fill), round caps                  |
| Areas            | `--viking-chart-area-opacity` ~0.22–0.28                                        |
| Points / bars    | Small radius, surface stroke contrast                                           |
| Legend           | Centered, `--viking-chart-legend-gap`, small rounded swatches                   |
| Tooltip          | Surface-raised, token styled, positioned on hover (line/area)                   |
| Gutter / spacing | Generous default (clean, well-spaced): 12/20/36/44 or fill variant              |
| Empty / loading  | `viking-chart-empty-state` (fill/overlay/inline) + loading skeleton support     |
| Panel shell      | `viking-chart-panel` + `viking-chart-card-header` for consistent card rhythm    |

**Rules:**

- All values resolve to `--viking-*` tokens.
- Solid fills/strokes (no gradients).
- `aria` on figure + accessible labels.
- Interactive tooltips + zoom/pan on zoomable line/bar.
- Mobile-first: readable axis (min 12px), reduced label density, min segment widths.
- Use `viking-chart-panel[loading]="true"` + `viking-chart-empty-state` for states.
- Uptime timelines share the same surface / radius / gap language.

### 8.6 Badges, callouts, toasts

Tones: `accent` | `success` | `warning` | `danger` | `muted` — each resolves to soft background (`--viking-accent-soft`, etc.) + strong foreground.

### 8.7 Skeleton loaders

Shimmer uses `--viking-charcoal-700` → `--viking-charcoal-600` (dark) or `#EFEFEF` → `#F7F7F7` (light). No arbitrary animation colors.

### 8.8 Forms (field stack)

Compose every input through **`viking-field`** — the label wraps the control for implicit association (WCAG-friendly, accessible ergonomics).

```html
<viking-form-section title="Billing address">
  <viking-field
    label="Name on card"
    description="As printed on the card"
    [required]="true"
  >
    <viking-input autocomplete="cc-name" />
  </viking-field>
  <viking-field label="Card number" [error]="cardError()">
    <viking-input inputmode="numeric" />
  </viking-field>
  <div class="viking-form-row">
    <viking-field label="CVV"
      ><viking-input inputmode="numeric"
    /></viking-field>
    <viking-field label="Expiry"
      ><viking-input placeholder="MM / YY"
    /></viking-field>
  </div>
</viking-form-section>
```

| Element         | Token usage                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| Label           | `--viking-font-size-sm`, `--viking-font-weight-semibold`, `--viking-letter-spacing-wide`                 |
| Description     | `--viking-text-muted`, `--viking-font-size-sm`                                                           |
| Error           | `--viking-danger-text`, shake via `viking-shake` keyframe                                                |
| Control surface | `--viking-surface-alt` bg, `--viking-border`, `--viking-radius-sm`, min-height `--viking-control-height` |
| Focus           | `--viking-ring` outline on `:focus-visible`                                                              |

### 8.9 Layout composition

Angular pages compose `viking-page-shell` → `viking-section` with
`viking-stack`, `viking-grid`, and `viking-cluster`. These primitives expose
only token-backed density, column, equal-row, and alignment choices. Static
surfaces use their matching `.page-inner-wrapper`, `.viking-section`,
`.viking-stack`, `.viking-grid`, and `.viking-cluster` classes. Do not recreate
these contracts with app-local wrappers or breakpoint CSS.

Application routes should use `viking-app-layout` and `viking-page-template`
for shell and page regions. `viking-page-template` supports `width="narrow"` (42rem),
`width="default"` (1260px), and `width="wide"` (1440px) for full-bleed dashboard surfaces.
Balanced dashboard and marketing content uses
`viking-column-layout` with one to four equal columns or intrinsic `auto`
tracks. Unequal regions use `viking-grid columns="12"` with
`viking-grid-item` mobile, tablet, and desktop spans. Content is inlaid in
`viking-container`, `viking-card`, `viking-chart-panel`, or another documented
surface primitive; route-specific grid and card wrappers are not layout APIs.

For content-led responsiveness, use `viking-grid columns="auto"` with the
`compact`, `default`, or `wide` item-size contract. Use `viking-switcher` when a
row must become a column from its own available width. These intrinsic layouts
keep 256px/320px/384px minimums on the 8px grid, set `min-width: 0` on children,
and can align structured card footers across equal-height rows without fixed
heights or text truncation.

**Wide-card density law:** information-dense metric, KPI, status, forecast, and
gauge groups render as one column when constrained and no more than two equal
columns (6/12 per item) when space allows. Their grid tracks and children stretch
to equal height. Compact labels, captions, and values stay on one line; use
ellipsis plus a complete accessible name at genuinely narrow widths rather than
wrapping one tile into a different height. Do not use four-across 3/12 layouts
for dense operational cards. This rule does not apply to simple navigation or
non-content collections such as footer link groups.

---

## 9. Z-index layering

| Token                | Value | Layer          |
| -------------------- | ----- | -------------- |
| `--viking-z-overlay` | 1000  | Modals, sheets |
| `--viking-z-toast`   | 1100  | Toasts         |
| `--viking-z-tooltip` | 1200  | Tooltips       |

---

## 10. Usage examples

### 10.1 Angular app

```scss
@use "@dataengineeringformachinelearning/viking-ui/styles/viking-ui";
```

```html
<html data-theme="dark">
  <viking-button variant="primary">Deploy</viking-button>
  <viking-card>…</viking-card>
</html>
```

### 10.2 Static surfaces (Django, marketing, Swagger)

```html
<link rel="stylesheet" href="/assets/viking-ui.css" />
<div style="background: var(--viking-bg); color: var(--viking-text);">…</div>
```

### 10.3 Custom component styling

```css
.my-panel {
  background: var(--viking-surface);
  border: 1px solid var(--viking-border);
  border-radius: var(--viking-radius-lg);
  padding: var(--viking-space-3);
  box-shadow: var(--viking-shadow-sm);
  transition: var(--viking-transition-colors);
}

.my-panel:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
}
```

### 10.4 Chart series binding

```typescript
series = [
  { name: 'Latency P99', data: [...], tone: 'accent' },
  { name: 'Error rate', data: [...], tone: 'danger' },
];
```

### 10.5 Tailwind CSS

Load token CSS first, then extend Tailwind with the Viking preset:

```javascript
// tailwind.config.js
module.exports = {
  presets: [require("./packages/viking-ui/src/tokens/tailwind.preset.js")],
  content: ["./src/**/*.{html,ts}"],
};
```

```html
<link rel="stylesheet" href="/assets/viking-ui.css" />
```

Utility examples: `bg-viking-surface`, `text-viking-text-muted`, `rounded-viking-lg`, `shadow-viking-sm`, `p-viking-3`, `text-viking-series-1`.

---

## 11. Do's and don'ts

### Do

- Use `--viking-*` tokens everywhere; compile from `_variables.scss` when changing the palette.
- Implement every visual decision inside `packages/viking-ui/`, then consume it through the package, synced artifacts, or CDN delivery.
- Keep the final aesthetic anchored in premium precision-engineered command surfaces: austere geometry, clean primitives, dense operational data.
- Keep layouts on the 8px primary spacing grid; max content width 1260px.
- Use negative letter-spacing on headings for a precision instrument feel.
- Prefer `viking-chart` native SVG for all data visualization.
- Use `viking-icon-heading` / `IconHeading.astro` for icon + title rows in bento cards and integration tiles — never hand-roll `.bento-header` flex rows.
- Bento grids with a full-width lead card: remaining half-width tiles **must** be an even count (2, 4, 6…) — use `DocsBentoGrid evenPairs` on marketing docs.
- Test with `node scripts/run_axe.js` before shipping UI changes.
- Load Inter from `_fonts.scss` (self-hosted variable woff2) on every surface — never from Google Fonts CDN.

### Don't

- Add new styles, visual overrides, or component-local CSS in `frontend/`, `marketing/`, `viking-ui-docs/`, or `backend/`.
- Copy reference-site styling or import external component libraries. Use high-quality references as directional quality bars only.
- Hardcode hex colors (`#2176FF`, `#31393C`, etc.) — the legacy Lab Coat palette is **retired**.
- Add gradient orbs, mesh backgrounds, or stock illustration clutter.
- Use emojis in product UI (exception: 🇺🇸 on approved badges only).
- Use third-party chart or icon runtimes in Viking-UI surfaces.
- Set border-radius above 16px except pills (`999px`).
- Rely on color alone for status — pair with icon, label, or pattern.
- Register customer domains in static CORS/CSS — use database-driven CORS per AGENTS.md.

---

## 12. Documentation surfaces

Marketing documentation pages (`/book`, `/whitepaper`, `/documentation`) share Viking-UI tokens via `viking-ui.css` and follow these layout rules:

| Page               | Source                                        | Layout                                                           |
| ------------------ | --------------------------------------------- | ---------------------------------------------------------------- |
| **The Book**       | `BOOK.md` → `sync_content.py` → `page.md`     | Sidebar chapter nav, glass hero, 900px reading column            |
| **The Whitepaper** | `WHITEPAPER.md` → `whitepaper.md`             | Sticky section nav, two-column card grid, integration pill strip |
| **Documentation**  | Static Astro + `docs/integrations/*.md` links | Sticky outline nav, bento API cards, six integration examples    |

All three pages use `--viking-accent` for primary CTAs, `--viking-charcoal-900` code blocks, and `--container-max-width` (1260px) outer wrappers. Never hardcode integration names inconsistently — the six official platforms are Kubernetes, TensorFlow, PyTorch, Apache Spark, Databricks, and AWS Redshift.

---

## 13. Maintenance

1. Edit `packages/viking-ui/src/styles/_variables.scss` for primitive token changes (single source of truth).
2. Edit `_series-colors.scss` if the chart/picker palette changes; sync `viking-tokens.json` and `series-presets.ts`.
3. Run `npm run build:viking-ui:package` to regenerate CSS, Web Component, utility, widget, token, and Angular package artifacts.
4. Run `python scripts/sync_design_system.py` to propagate `viking-ui.css`, Web Components, token JSON, widgets, and fonts.
5. Run `python scripts/sync_fonts.py` after updating Inter font files.
6. Update this document when tokens or component standards change.
7. Sync marketing/backend copies in CI or publish step.
8. Run `python scripts/sync_content.py` after editing `BOOK.md`, `WHITEPAPER.md`, or `README.md`.

**Surface partials:** `packages/viking-ui/src/styles/surfaces/app-pages.scss` is composed of 8 focused partials (`_dashboard-overview.scss`, `_vulnerabilities-triage.scss`, `_siem-soc-operations.scss`, `_settings-integrations.scss`, `_account-mfa-enrollment.scss`, `_premium-app-polish.scss`, `_page-header-status-cta.scss`, `_content-aware-layouts.scss`). Add page-level styles to the appropriate partial — do not append to the monolith.

---

## 14. Governance & agent alignment

All contributors, LLMs, and Cursor agents must keep DEML visually unified through a single rule stack:

| Layer               | File                                                                        | Role                                                                       |
| ------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| IDE / Cursor        | [.cursorrules](.cursorrules)                                                | Mandatory Viking-UI imports, composable composition, zero hardcoded styles |
| Tokens & components | **THEME.md** (this file)                                                    | Canonical `--viking-*` matrix, component standards, do's/don'ts            |
| Platform invariants | [AGENTS.md](AGENTS.md)                                                      | Architecture, security, automation, Viking-UI Uniformity Law               |
| Narrative & build   | [BOOK.md § Ch.32](BOOK.md#chapter-32-viking-ui--the-zero-dependency-ui-kit) | Kit philosophy, consumption, publish workflow                              |

### Unified component policy

- **Angular:** always `@dataengineeringformachinelearning/viking-ui` — no Material, no third-party UI runtimes, no one-off styled controls when a `viking-*` exists.
- **Extend the library first:** shared primitives ship in `packages/viking-ui/`; apps consume public package entrypoints, they do not duplicate or import package source internals.
- **Composable ergonomics, Viking palette:** field stacks (`viking-field` → control), card surfaces (`viking-card`), button variants (`viking-button`) per §8 and the pattern mapping table in §Design philosophy.
- **Final aesthetic:** premium precision-engineered command surfaces — machined industrial geometry, clean component language, dense operational data, and electric/crimson accent discipline. Data dominates ornament.
- **Non-Angular:** static `viking-ui.css` + semantic aliases, Web Components from `web-components.js`, and Angular-free utility subpaths only; run `sync_design_system.py` after token edits.
- **Styling ownership:** all CSS, tokens, wrappers, Web Components, and chart treatments live in `packages/viking-ui/`; app surfaces never receive bespoke visual patches.

When changing governance text, update **.cursorrules**, **AGENTS.md**, **README.md**, and **BOOK.md Ch.32** in the same change set so agents and humans never drift.

**Theme identity:** Viking-UI premium palette (precision-engineered command aesthetic, deep navy / teal / crimson, composable primitives, dense operational data, unified package governance). The publish version is read from `packages/viking-ui/package.json`; never duplicate it in customer-facing UI. Supersedes Lab Coat (`jet-black`, `crayola-blue`, `blue-bell`, `golden-pollen`, `carrot-orange`).
