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

### Spacing & type
- [ ] Gaps use numbered or semantic space tokens — no `13px` / `18px` / `27px`
- [ ] Page gutters use `--suite-page-gutter` / `--viking-page-gutter`
- [ ] Readable prose caps at `--suite-readable-max` (48rem)
- [ ] Breakpoints use `--suite-bp-*` / `--viking-bp-*` (`600 / 768 / 901 / 1024 / 1440 / 1920`)

### Interaction states
- [ ] Every control has intentional **hover**, **active**, **focus-visible**, **disabled**
- [ ] Focus uses `--suite-ring` + offset — never `outline: none` without a replacement
- [ ] Touch targets ≥ `--suite-touch` (44px) on mobile; dense desktop controls may be 40px tall with ≥44px hit area
- [ ] Invalid fields set `data-invalid="true"` (and visible error text with `role="alert"`)
- [ ] Active nav uses `aria-current="page"` (not color alone)

### Hierarchy & noise
- [ ] Elevation via 1px borders + stepped surfaces + `--suite-shadow-*` — no glow stacks
- [ ] One job per section; no pill clusters, stat strips, or floating badge overlays in heroes
- [ ] Status never color-only — pair with label/icon/pattern
- [ ] Landing atmosphere stays subtle (low-mix command light, no pulse glows)

### States (empty / loading / error)
- [ ] Lists/tables use suite empty + skeleton primitives (`viking-empty` / `forjd-empty`, skeletons)
- [ ] Loading is skeletal or overlay — not generic CSS spinners
- [ ] Errors are inline field alerts or toast/callout — not `alert()`

### Mobile-first & a11y
- [ ] Layout starts single-column; scale at md/lg tokens
- [ ] Keyboard: tabs support Arrow/Home/End; dialogs trap focus; overlays Esc-dismiss
- [ ] `prefers-reduced-motion` disables non-essential motion
- [ ] WCAG 2.1 AA contrast on text, icons, and focus rings

### Gates
```bash
node scripts/enforce-theme.js
node scripts/check_mobile_first.js
node scripts/run_axe.js
npm run suite:tokens
```
