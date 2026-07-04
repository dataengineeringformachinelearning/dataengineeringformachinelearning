# @dataengineeringformachinelearning/viking-ui

**Viking-UI v2** is DEML's framework-agnostic design system — one visual language for Angular, Astro, Django, and any HTML surface. Tokens are the single source of truth; Web Components and CSS classes share the same `--viking-*` variables.

## Design philosophy

- **Deep navy surfaces** + **electric blue accents** — precision-engineered industrial luxury
- **CSS custom properties** as the only palette source (`_variables.scss` → `design-tokens.css`)
- **Composable primitives** — `viking-field` → `viking-input`, `viking-button` variants
- **WCAG 2.1 AA** focus rings, 44px touch targets, keyboard navigation
- **Zero third-party UI runtimes** — native SVG icons, no Material/Bootstrap

## Package structure (v2)

```
frontend/projects/viking-ui/
├── src/
│   ├── styles/                 # Canonical SCSS → compiled CSS
│   │   ├── _variables.scss     # ★ Edit tokens here first
│   │   ├── _buttons.scss       # .viking-btn-* base classes
│   │   ├── _forms.scss         # .viking-control surface
│   │   ├── _input.scss         # .viking-input-* base classes
│   │   ├── tokens-export.scss  # → design-tokens.css
│   │   ├── components-bundle.scss  # → viking-components.css
│   │   └── viking-ui-bundle.scss   # → viking-ui.css (full)
│   ├── web/                    # Framework-agnostic Web Components
│   │   ├── core/               # Shadow styles + utilities
│   │   ├── button/             # <viking-button-wc>
│   │   ├── input/              # <viking-input-wc>
│   │   └── index.ts            # registerVikingElements()
│   ├── lib/                    # Angular thin wrappers (backward compatible)
│   │   ├── button/             # <viking-button> → viking-button-wc
│   │   └── input/              # <viking-input> → viking-input-wc
│   └── tokens/                 # JSON, Tailwind preset, series presets
├── scripts/
│   └── build-web-components.mjs
└── package.json                # exports: tokens.css, components.css, elements.js
```

## Consumption modes

| Surface | Load | Use |
| ------- | ---- | --- |
| **Django / static HTML** | `design-tokens.css` + `viking-components.css` | `<button class="viking-btn viking-btn-primary">` or `<div class="viking-input-shell"><input class="viking-input-native" /></div>` |
| **Astro / marketing** | tokens + components CSS + `viking-ui-elements.js` | `<viking-button-wc variant="primary">Launch</viking-button-wc>` |
| **Angular** | App styles + `registerVikingElements()` | `import { VikingButton, VikingInput } from '@dataengineeringformachinelearning/viking-ui'` |

### CSS-only (Django templates)

```html
<link rel="stylesheet" href="/static/design-tokens.css" />
<link rel="stylesheet" href="/static/viking-components.css" />

<button type="button" class="viking-btn viking-btn-primary">Deploy</button>

<div class="viking-input-shell">
  <input class="viking-input-native" type="email" placeholder="you@company.com" />
</div>
```

Set theme on `<html data-theme="dark">` (default) or `data-theme="light"`.

### Web Components (Astro, vanilla JS)

```html
<link rel="stylesheet" href="/assets/design-tokens.css" />
<script type="module" src="/assets/viking-ui-elements.js"></script>

<viking-button-wc variant="primary" type="button">Launch sequence</viking-button-wc>
<viking-input-wc placeholder="Mission ID" name="mission" clearable></viking-input-wc>
```

Or register manually:

```typescript
import { registerVikingElements } from '@dataengineeringformachinelearning/viking-ui';
registerVikingElements();
```

### Angular (thin wrappers)

```typescript
import { VikingButton, VikingField, VikingInput } from '@dataengineeringformachinelearning/viking-ui';
```

```html
<viking-field label="Email" [required]="true">
  <viking-input type="email" placeholder="you@company.com" />
</viking-field>
<viking-button variant="primary">Save</viking-button>
```

## Token files

| Artifact | Path | Output |
| -------- | ---- | ------ |
| SCSS primitives | `src/styles/_variables.scss` | — |
| Design tokens | `tokens-export.scss` | `design-tokens.css` |
| Interactive primitives | `components-bundle.scss` | `viking-components.css` |
| Full static bundle | `viking-ui-bundle.scss` | `viking-ui.css` |
| Web Components | `src/web/index.ts` | `viking-ui-elements.js` |
| JSON export | `src/tokens/viking-tokens.json` | Tooling / docs |
| Tailwind preset | `src/tokens/tailwind.preset.js` | `theme.extend` |

## Build

```bash
# Static CSS + Web Components (from repo root)
npm run build:static-css --prefix viking-ui-docs
python scripts/sync_design_system.py

# Angular library
cd frontend && npm run build:viking-ui
```

## npm exports

```json
{
  ".": "Angular + Web Component registration API",
  "./tokens.css": "design-tokens.css",
  "./components.css": "viking-components.css",
  "./viking-ui.css": "Full static bundle",
  "./elements": "viking-ui-elements.js (auto-registers custom elements)"
}
```

## License

Apache-2.0 — see [LICENSE](./LICENSE).
