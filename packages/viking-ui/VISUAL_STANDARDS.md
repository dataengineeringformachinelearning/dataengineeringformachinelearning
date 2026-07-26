# Visual standards checklist (Viking-UI / Suite)

Reusable gate for DEML + FORJD product chrome. Canonical tokens: `THEME.md` + `src/tokens/suite-tokens.css`.

**Grid:** 8px primary / 4px tight exception (`--suite-space-unit`). Not 9px.
**Aesthetic:** void-black command surfaces, electric `#2176ff`, institutional gold — restrained, high-signal, no neon orbs.

---

## Before merge

### Tokens & ownership

- [ ] Every color/spacing/radius/shadow/motion resolves to `--suite-*` (or `--viking-*` / `--fj-*` alias)
- [ ] No raw hex/rgb outside token files (brand SVG artwork is the only exception)
- [ ] No app-local `styleUrl` / page SCSS for product chrome — extend Viking / forjd-ui first
- [ ] FORJD styles stay byte-synced from DEML (`npm run sync:suite`)

### Images & fonts

- [ ] Preload Inter roman only: `/fonts/inter/InterVariable.woff2` (`as="font"` + `crossorigin`)
- [ ] Prefer SVG favicons first; keep PNG/ICO fallbacks
- [ ] Content `<img>`: `width`/`height`, `loading="lazy"`, `decoding="async"`; LCP/hero: `fetchpriority="high"` + `loading="eager"`
- [ ] Icons via `viking-icon` / suite SVG — no Material font packages or photographic icon sprites

### Spacing & type

- [ ] Gaps use numbered or semantic space tokens — no `13px` / `18px` / `27px`
- [ ] Page gutters use `--suite-page-gutter` / `--viking-page-gutter`
- [ ] Hierarchy air via `--suite-section-gap` / `--suite-block-gap`; dense rows via `--suite-density-gap`
- [ ] Readable prose caps at `--suite-readable-max` (48rem)
- [ ] Breakpoints use `--suite-bp-*` / `--viking-bp-*` (`600 / 768 / 901 / 1024 / 1440 / 1920`)

### Interaction states

- [ ] Every control has intentional **hover**, **active**, **focus-visible**, **disabled**
- [ ] Buttons / inputs / selects / tabs share `--_control-h` grid (44→40 at md; `data-size` sm/lg)
- [ ] Tactile: hover lift + elevation step; press sink + inset; fields rest as inset wells
- [ ] Motion uses suite tokens only (`--suite-duration*` / `--suite-ease*` / `--suite-hover-lift`) — 1px lift max, no bounce/glow
- [ ] Focus uses `--suite-ring` + offset (+ `--suite-control-focus-ring` on fields) — never bare `outline: none`
- [ ] Touch targets ≥ `--suite-touch` (44px) on mobile; dense desktop controls may be 40px tall with ≥44px hit area
- [ ] Invalid fields set `data-invalid="true"` (and visible error text with `role="alert"`)
- [ ] Active nav uses `aria-current="page"` (not color alone)
- [ ] `prefers-reduced-motion` zeros durations and disables transform micro-motion

### Hierarchy & noise

- [ ] Depth via `--suite-elevation-*` recipes (border + hairline ± drop) — no glow stacks
- [ ] Resting cards/panels = elevation-1; raised/interactive hover = 2–hover; modals/toasts = 3–4
- [ ] Glass (`--suite-glass*`) only on overlays (dialog/toast/loading) — never decorative on base cards
- [ ] Recessed wells (tabs/tables/inset empty) use `--suite-elevation-inset`
- [ ] One job per section; no pill clusters, stat strips, or floating badge overlays in heroes
- [ ] Status never color-only — pair with label/icon/pattern
- [ ] Landing atmosphere stays subtle (low-mix command light, no pulse glows)
- [ ] Honor `prefers-reduced-transparency` (opaque surfaces, no blur)

### States (empty / loading / error)

- [ ] Lists/tables use suite empty + skeleton primitives (`viking-empty-state` / `forjd-empty`, `.suite-skeleton-stack`)
- [ ] Data routes show `viking-page-skeleton` / `forjd-page-skeleton` (or card/chart `[loading]`) — never spinner-only blank shells
- [ ] Unbounded queues/tables use `viking-virtual-list` / `forjd-virtual-list` (or `forjd-table` auto-windowing) — not full-DOM `@for` dumps
- [ ] Empty copy names the missing thing + next step; optional mono `hint` for API/path context
- [ ] Loading uses `.suite-loading` / overlay panel with present-tense message — not a bare spinner
- [ ] Page/panel failures use `.suite-error-state` with retry action; field errors stay `.suite-error-text`
- [ ] Inline notices use toast/callout — never `alert()`

### Mobile-first & a11y

- [ ] Layout starts single-column; scale at md/lg tokens
- [ ] Skip link → `#main-content` (`tabindex="-1"`); ring via `--suite-ring` / `--viking-ring` only
- [ ] Keyboard: tabs/nav Arrow/Home/End; dialogs/sheets restore focus to opener; Esc-dismiss
- [ ] No second focus system — never `outline: none` without `:focus-visible` replacement
- [ ] `prefers-reduced-motion` disables non-essential motion
- [ ] WCAG 2.2 AA contrast on text, icons, and focus rings
- [ ] Focus not obscured under sticky chrome (`scroll-padding` / `scroll-margin`)
- [ ] Target size ≥24px (suite touch floor 44px); keyboard alternative for drag controls

### Gates

```bash
node scripts/enforce-theme.js
node scripts/check_mobile_first.js
node scripts/run_axe.js
npm run suite:tokens
```
