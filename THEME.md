# DEML Design System — Viking-UI Theme

**Single source of truth** for visual design across all DEML surfaces:

| Property                                                                               | Stack                          | Theme entry point                         |
| -------------------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------- |
| [dataengineeringformachinelearning.com](https://dataengineeringformachinelearning.com) | Marketing (Astro)              | `/assets/viking-ui.css` + this document   |
| [deml.app](https://deml.app)                                                           | Angular SSR frontend           | `frontend/projects/viking-ui/src/styles/` |
| [backend.deml.app](https://backend.deml.app)                                           | Django API + templates         | `backend/static/viking-ui.css`            |
| Swagger / OpenAPI UI                                                                   | Django Ninja docs              | Same tokens via static CSS                |
| Marketing site                                                                         | `marketing/`                   | `marketing/public/assets/viking-ui.css`   |
| Docs & Book                                                                            | Synced content + Drakkar shell | THEME.md tokens in prose and components   |
| Viking-UI Showcase                                                                     | Component gallery              | `viking-ui-showcase`                      |

**Canonical implementation:** `frontend/projects/viking-ui/src/styles/_variables.scss`
**Compiled CSS:** `viking-ui.css` (copied to `frontend/`, `backend/static/`, `marketing/public/assets/`)

---

## Design philosophy

Viking-UI expresses **Porsche-like precision** and **Wallace Corp high-end industrial tech**:

- **Dark-first engineering aesthetic** — deep charcoals, machined metallic edges, no decorative noise.
- **Luxurious minimalism** — every pixel earns its place; data and metrics dominate ornament.
- **Tactile surfaces** — subtle top-edge highlights (`inset 0 1px 0 rgba(255,255,255,0.04–0.06)`), restrained elevation, crisp borders.
- **Refined accent discipline** — deep teal for primary action, rich crimson for secondary emphasis and danger; no neon gradients or ambient glow orbs on base surfaces.
- **WCAG 2.1 AA** — contrast, focus rings, touch targets (44px mobile minimum), keyboard navigation.
- **Zero arbitrary hex** — all colors resolve to tokens below. Emojis are prohibited except 🇺🇸 on specific badges.

---

## 1. Color palette

### 1.1 Charcoal surfaces (neutrals)

Deep grays anchor every surface. Use stepped elevation, not arbitrary shades.

| Token                   | HEX       | RGB               | Role                               |
| ----------------------- | --------- | ----------------- | ---------------------------------- |
| `--viking-charcoal-950` | `#0A0A0A` | `rgb(10, 10, 10)` | Deepest backdrop, modal scrim base |
| `--viking-charcoal-900` | `#111111` | `rgb(17, 17, 17)` | Default page background (dark)     |
| `--viking-charcoal-800` | `#1A1A1A` | `rgb(26, 26, 26)` | Cards, panels, sidebars            |
| `--viking-charcoal-700` | `#2A2A2A` | `rgb(42, 42, 42)` | Elevated surfaces, inputs          |
| `--viking-charcoal-600` | `#333333` | `rgb(51, 51, 51)` | Raised chips, hover states         |
| `--viking-charcoal-500` | `#444444` | `rgb(68, 68, 68)` | Strong dividers (rare)             |

### 1.2 Metallic accents (borders & depth)

Machined aluminum feel — borders, axis lines, muted shell trim.

| Token                   | HEX       | RGB                  | Role                    |
| ----------------------- | --------- | -------------------- | ----------------------- |
| `--viking-metallic-600` | `#555555` | `rgb(85, 85, 85)`    | Border mix base         |
| `--viking-metallic-500` | `#666666` | `rgb(102, 102, 102)` | Muted text (light mode) |
| `--viking-metallic-400` | `#777777` | `rgb(119, 119, 119)` | Strong borders          |
| `--viking-metallic-300` | `#999999` | `rgb(153, 153, 153)` | Subtle labels           |
| `--viking-metallic-200` | `#AAAAAA` | `rgb(170, 170, 170)` | Muted text (dark mode)  |
| `--viking-metallic-100` | `#BBBBBB` | `rgb(187, 187, 187)` | Disabled shell trim     |

### 1.3 Primary — deep teal

Primary CTAs, links, focus rings, series 1 in charts.

| Token               | HEX       | RGB                 | Role                                          |
| ------------------- | --------- | ------------------- | --------------------------------------------- |
| `--viking-teal-700` | `#0A5C5F` | `rgb(10, 92, 95)`   | Primary (light mode)                          |
| `--viking-teal-600` | `#0D7377` | `rgb(13, 115, 119)` | Primary (dark mode), **Series color default** |
| `--viking-teal-500` | `#109094` | `rgb(16, 144, 148)` | Hover                                         |
| `--viking-teal-400` | `#14A3A8` | `rgb(20, 163, 168)` | Focus ring, strong accent                     |
| `--viking-teal-300` | `#2DB8BD` | `rgb(45, 184, 189)` | Highlights (sparingly)                        |

### 1.4 Secondary — rich crimson

Secondary emphasis, destructive actions, critical series.

| Token                  | HEX       | RGB                | Role                     |
| ---------------------- | --------- | ------------------ | ------------------------ |
| `--viking-crimson-700` | `#7A2231` | `rgb(122, 34, 49)` | Secondary (light mode)   |
| `--viking-crimson-600` | `#922B3E` | `rgb(146, 43, 62)` | Secondary (dark mode)    |
| `--viking-crimson-500` | `#A83344` | `rgb(168, 51, 68)` | Danger default, series 5 |
| `--viking-crimson-400` | `#C44355` | `rgb(196, 67, 85)` | Danger text (dark)       |

### 1.5 Semantic status

| Token                | HEX       | RGB                 | Role                      |
| -------------------- | --------- | ------------------- | ------------------------- |
| `--viking-green-500` | `#2A9D8F` | `rgb(42, 157, 143)` | Success, stable, series 3 |
| `--viking-gold-500`  | `#C4A035` | `rgb(196, 160, 53)` | Warning, series 4         |
| `--viking-blue-500`  | `#3D8BFD` | `rgb(61, 139, 253)` | Info, series 6            |

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
| `--color-primary`  | `--viking-teal-600`        |
| `--accent-color`   | `--viking-crimson-600`     |
| `--bg-color`       | `--viking-bg`              |
| `--text-color`     | `--viking-text`            |
| `--card-bg`        | `--viking-surface`         |
| `--base-font-size` | `16px` floor               |
| `--ui-font-size`   | `14px` Drakkar shell floor |

---

## 2. Typography

### 2.1 Font families

| Token                                     | Stack                                                       | Usage                                                |
| ----------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| `--viking-font-family`                    | `'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif` | Body, Drakkar shell, tables, forms                   |
| `--viking-font-family-mono`               | `'JetBrains Mono', 'SF Mono', 'Consolas', monospace`        | Code, hex values, telemetry IDs                      |
| Display (marketing / CES instrumentation) | `'Orbitron', 'Michroma', var(--viking-font-family)`         | Hero headlines, gauge badges, instrument labels only |

**Rules:**

- **16px minimum** for main content (`--viking-font-size` / `--base-font-size`).
- **14px minimum** for Drakkar shell controls (`--viking-font-size-sm` / `--ui-font-size`).
- Headings use `--viking-letter-spacing-tight` (`-0.02em`) or `--viking-letter-spacing-tighter` (`-0.03em`).
- Instrument / badge caps use `--viking-letter-spacing-caps` (`0.08em`) — never on body copy.
- Metrics and KPIs: `--viking-font-weight-semibold` or `--viking-font-weight-bold`, tabular nums where applicable.

### 2.2 Type scale

| Token                         | Size | Typical use              |
| ----------------------------- | ---- | ------------------------ |
| `--viking-font-size-2xs`      | 11px | Legal micro-copy (avoid) |
| `--viking-font-size-xs`       | 12px | Chart axis, badges       |
| `--viking-font-size-sm`       | 14px | Buttons, labels, nav     |
| `--viking-font-size` / `base` | 16px | Body text                |
| `--viking-font-size-md`       | 18px | Lead paragraphs          |
| `--viking-font-size-lg`       | 20px | Section titles           |
| `--viking-font-size-xl`       | 24px | Page headings            |
| `--viking-font-size-2xl`      | 30px | Hero subheads            |
| `--viking-font-size-3xl`      | 36px | Marketing hero           |
| `--viking-font-size-4xl`      | 48px | Display (marketing only) |

### 2.3 Line height & weight

| Token                           | Value |
| ------------------------------- | ----- |
| `--viking-line-height-tight`    | 1.25  |
| `--viking-line-height-snug`     | 1.375 |
| `--viking-line-height-normal`   | 1.5   |
| `--viking-line-height-relaxed`  | 1.625 |
| `--viking-font-weight-regular`  | 400   |
| `--viking-font-weight-medium`   | 500   |
| `--viking-font-weight-semibold` | 600   |
| `--viking-font-weight-bold`     | 700   |

---

## 3. Spacing (4px base grid)

All layout, padding, and gaps are multiples of `--viking-grid-unit: 4px`.

| Token                 | Value | Multiples |
| --------------------- | ----- | --------- |
| `--viking-space-0`    | 0     | —         |
| `--viking-space-px`   | 1px   | hairline  |
| `--viking-space-half` | 4px   | 1×        |
| `--viking-space-1`    | 8px   | 2×        |
| `--viking-space-1-5`  | 12px  | 3×        |
| `--viking-space-2`    | 16px  | 4×        |
| `--viking-space-3`    | 24px  | 6×        |
| `--viking-space-4`    | 32px  | 8×        |
| `--viking-space-5`    | 40px  | 10×       |
| `--viking-space-6`    | 48px  | 12×       |
| `--viking-space-7`    | 56px  | 14×       |
| `--viking-space-8`    | 64px  | 16×       |
| `--viking-space-9`    | 80px  | 20×       |
| `--viking-space-10`   | 96px  | 24×       |

**Layout constants:**

| Token                          | Value                          |
| ------------------------------ | ------------------------------ |
| `--viking-container-max-width` | 1260px (`.page-inner-wrapper`) |
| `--viking-navbar-height`       | 64px                           |
| `--viking-sidebar-width`       | 256px                          |
| `--viking-control-height`      | 40px (44px on mobile)          |
| `--viking-control-height-sm`   | 32px                           |
| `--viking-control-height-xs`   | 24px                           |
| `--viking-btn-min-width`       | 120px                          |

**Mobile-first:** default styles target small screens; scale up with `@media (min-width: 768px)`.

---

## 4. Border radius

Premium feel: 6–12px for interactive surfaces; pills for tags only.

| Token                  | Value | Use                    |
| ---------------------- | ----- | ---------------------- |
| `--viking-radius-xs`   | 4px   | Kbd, micro chips       |
| `--viking-radius-sm`   | 6px   | Inputs (compact)       |
| `--viking-radius`      | 8px   | Buttons, swatches      |
| `--viking-radius-md`   | 10px  | Modals (inner)         |
| `--viking-radius-lg`   | 12px  | Cards, panels          |
| `--viking-radius-xl`   | 16px  | Hero cards (marketing) |
| `--viking-radius-pill` | 999px | Badges, pills          |

---

## 5. Shadows & elevation

Soft, directional shadows with a **machined top edge** (inset highlight). No diffuse colored glows on standard UI.

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
| Primary accent   | `--viking-teal-600`     |
| Secondary accent | `--viking-crimson-600`  |
| Focus ring       | `--viking-teal-400`     |

### 7.3 Light mode

| Role             | Maps to                               |
| ---------------- | ------------------------------------- |
| Background       | `--viking-white-pure`                 |
| Surface          | `--viking-white-pure` / `#F7F7F7` alt |
| Text             | `--viking-charcoal-900`               |
| Muted text       | `--viking-metallic-500`               |
| Primary accent   | `--viking-teal-700`                   |
| Secondary accent | `--viking-crimson-700`                |
| Focus ring       | `--viking-teal-600`                   |

### 7.4 Dark mode rules

- **Do** keep surfaces within the charcoal scale; increase elevation by stepping token, not opacity stacks.
- **Do** use `color-mix(in srgb, …)` for borders — never raw semi-transparent hex literals.
- **Do** maintain 4.5:1 contrast for body text, 3:1 for large text and UI components.
- **Don't** use pure `#000` page backgrounds (use `--viking-charcoal-900`).
- **Don't** invert accent hues between modes — only shift lightness (teal-600 ↔ teal-700).
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

- Background: `--viking-surface`; border: `--viking-border`; radius: `--viking-radius-lg`.
- Shadow: `--viking-shadow-sm`; optional top-edge metallic hairline via `::before` gradient.
- Padding: `--viking-space-3` (compact: `--viking-space-2`).
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

#### Preset swatches (default order)

| #   | HEX       | Token / role            | Use                               |
| --- | --------- | ----------------------- | --------------------------------- |
| 1   | `#0D7377` | `--viking-teal-600`     | Primary series, default selection |
| 2   | `#922B3E` | `--viking-crimson-600`  | Secondary / comparison series     |
| 3   | `#2A9D8F` | `--viking-green-500`    | Success / stable metrics          |
| 4   | `#C4A035` | `--viking-gold-500`     | Warning / threshold proximity     |
| 5   | `#A83344` | `--viking-crimson-500`  | Critical / anomaly series         |
| 6   | `#3D8BFD` | `--viking-blue-500`     | Info / auxiliary series           |
| 7   | `#2A2A2A` | `--viking-charcoal-700` | Baseline / muted series           |
| 8   | `#666666` | `--viking-metallic-500` | Disabled / archived series        |

**Default value:** `#0D7377` (`--viking-teal-600`)

**Implementation reference:**

```typescript
// frontend/projects/viking-ui/src/lib/color-picker/color-picker.ts
readonly presets = input<string[]>([
  '#0d7377', '#922b3e', '#2a9d8f', '#c4a035',
  '#a83344', '#3d8bfd', '#2a2a2a', '#666666',
]);
readonly value = model<string>('#0d7377');
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

### 8.5 Charts (`viking-chart`)

Map series tones to semantic tokens — never raw hex in chart code.

| Tone      | CSS variable               | Default series slot |
| --------- | -------------------------- | ------------------- |
| `accent`  | `var(--viking-accent)`     | Series 1            |
| `success` | `var(--viking-success)`    | Series 3            |
| `warning` | `var(--viking-warning)`    | Series 4            |
| `danger`  | `var(--viking-danger)`     | Series 5            |
| `muted`   | `var(--viking-text-muted)` | Baseline            |

| Chart element | Token                                                        |
| ------------- | ------------------------------------------------------------ |
| Grid lines    | `--viking-border` at ~55% mix                                |
| Axis labels   | `--viking-text-muted`, `--viking-chart-axis-size` (12px min) |
| Chart surface | `--viking-surface`                                           |

**Rules:** solid fills/strokes only (no chart gradients); `aria-hidden` on decorative SVG; data charts expose `label` / `summary`.

### 8.6 Badges, callouts, toasts

Tones: `accent` | `success` | `warning` | `danger` | `muted` — each resolves to soft background (`--viking-accent-soft`, etc.) + strong foreground.

### 8.7 Skeleton loaders

Shimmer uses `--viking-charcoal-700` → `--viking-charcoal-600` (dark) or `#EFEFEF` → `#F7F7F7` (light). No arbitrary animation colors.

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

---

## 11. Do's and don'ts

### Do

- Use `--viking-*` tokens everywhere; compile from `_variables.scss` when changing the palette.
- Keep layouts on the 4px grid; max content width 1260px.
- Use negative letter-spacing on headings for a precision instrument feel.
- Prefer `viking-chart` native SVG for all data visualization.
- Test with `node scripts/run_axe.js` before shipping UI changes.
- Load Inter (+ Orbitron/Michroma on marketing/instrument surfaces) from the same font pipeline.

### Don't

- Hardcode hex colors (`#2176FF`, `#31393C`, etc.) — the legacy Lab Coat palette is **retired**.
- Add gradient orbs, mesh backgrounds, or stock illustration clutter.
- Use emojis in product UI (exception: 🇺🇸 on approved badges only).
- Use third-party chart or icon runtimes in Viking-UI surfaces.
- Set border-radius above 16px except pills (`999px`).
- Rely on color alone for status — pair with icon, label, or pattern.
- Register customer domains in static CORS/CSS — use database-driven CORS per AGENTS.md.

---

## 12. Maintenance

1. Edit `frontend/projects/viking-ui/src/styles/_variables.scss` for token changes.
2. Run `npm run build:viking-ui-css` to regenerate `viking-ui.css` artifacts.
3. Update this document and `viking-color-picker` presets if the series palette changes.
4. Sync marketing/backend copies of `viking-ui.css` in CI or publish step.

**Version:** Viking-UI premium palette v2 (charcoal / teal / crimson). Supersedes Lab Coat (`jet-black`, `crayola-blue`, `blue-bell`, `golden-pollen`, `carrot-orange`).
