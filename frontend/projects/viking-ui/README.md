# @dataengineeringformachinelearning/viking-ui

**Viking-UI v2** is DEML's framework-agnostic design system — one visual language for Angular, Astro, Django, and any HTML surface. Tokens are the single source of truth; Web Components and CSS classes share the same `--viking-*` variables.

**Documentation:** [ui.dataengineeringformachinelearning.com](https://ui.dataengineeringformachinelearning.com)
**Contributing:** [CONTRIBUTING.md](../../CONTRIBUTING.md)

## Design philosophy

- **Deep charcoal surfaces** + **restrained teal/crimson accents** — precision-engineered industrial luxury
- **CSS custom properties** as the only palette source (`_variables.scss` → `design-tokens.css`)
- **Composable primitives** — `viking-field` → `viking-input`, `viking-button` variants
- **WCAG 2.1 AA** focus rings, 44px touch targets, keyboard navigation
- **Zero third-party UI runtimes** — native SVG icons, no Material/Bootstrap

## Quick install

### npm (Angular)

```bash
npm install @dataengineeringformachinelearning/viking-ui
```

```typescript
import { VikingButton, VikingField, VikingInput } from '@dataengineeringformachinelearning/viking-ui';

@Component({
  imports: [VikingButton, VikingField, VikingInput],
  template: `
    <viking-field label="Email" [required]="true">
      <viking-input type="email" placeholder="you@company.com" />
    </viking-field>
    <viking-button variant="primary">Save</viking-button>
  `,
})
```

### Astro (minimal setup)

```html
<!-- Layout.astro -->
<link rel="stylesheet" href="/assets/viking-ui.css" />
<link rel="stylesheet" href="/assets/viking-ui.css" />
<script type="module" src="/assets/viking-ui-elements.js"></script>

<viking-button-wc variant="primary">Launch</viking-button-wc>
<viking-input-wc placeholder="Mission ID" clearable></viking-input-wc>
```

### Django (minimal setup)

```html
{% load static %}
<link rel="stylesheet" href="{% static 'design-tokens.css' %}" />
<link rel="stylesheet" href="{% static 'viking-components.css' %}" />

<html data-theme="dark">
  <button type="button" class="viking-btn viking-btn-primary">Deploy</button>
  <div class="viking-input-shell">
    <input class="viking-input-native" type="email" placeholder="you@company.com" />
  </div>
</html>
```

See the [framework guides](https://ui.dataengineeringformachinelearning.com/frameworks) and [theming guide](https://ui.dataengineeringformachinelearning.com/theming) for complete setup.

## Package structure (v2)

```
frontend/projects/viking-ui/
├── src/
│   ├── styles/                 # Angular-only wrapper styles (legacy shell-specific overrides)
│   ├── public-api.ts           # Angular export surface
│   ├── lib/                    # Angular components (70+ primitives)
packages/viking-ui/             # Canonical library source (outside wrapper project)
├── src/styles/                 # Canonical SCSS tokens + components + bundles
│   ├── _variables.scss         # ★ Edit tokens here first
│   ├── _series-colors.scss     # Chart palette slots
│   ├── _legacy-aliases.scss    # Compat aliases
│   ├── tokens-export.scss      # → design-tokens.css
│   ├── components-bundle.scss  # → viking-components.css
│   └── viking-ui-bundle.scss   # → viking-ui.css (full)
├── src/web/                    # Framework-agnostic Web Components
├── src/tokens/                 # JSON, Tailwind preset, series presets
├── viking.manifest.json        # Machine-readable component catalog
└── package.json                # npm exports
```

## Consumption modes

| Surface                  | Load                                              | Use                                                                           |
| ------------------------ | ------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Django / static HTML** | `design-tokens.css` + `viking-components.css`     | `.viking-btn`, `.viking-card`, `.viking-input-shell`                          |
| **Astro / marketing**    | tokens + components CSS + `viking-ui-elements.js` | `<viking-button-wc variant="primary">`                                        |
| **Angular**              | App styles + npm package                          | `import { VikingButton } from '@dataengineeringformachinelearning/viking-ui'` |

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

## Build

```bash
# Static CSS + Web Components (from repo root)
npm run build:viking-ui:package --prefix ../..
python scripts/sync_design_system.py

# Angular library
cd frontend && npm run build:viking-ui

# Tests
cd frontend && npm run test:viking-ui
cd frontend && npm run check:viking-upstream
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](../../CONTRIBUTING.md) for:

- Development setup
- Adding new components (SCSS → Web Component → Angular)
- Quality gates and PR checklist
- Showcase documentation updates

## License

Apache-2.0 — see [LICENSE](./LICENSE).
