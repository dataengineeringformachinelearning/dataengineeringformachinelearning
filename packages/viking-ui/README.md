# Viking-UI

Universal DEML component library for Astro, Angular, and Django.

## Architecture

- `src/styles/_variables.scss` defines the canonical `--viking-*` design tokens.
- `src/styles/components-bundle.scss` defines static CSS primitives shared by every app.
- `src/tokens/viking-tokens.json` exposes the same token contract for tooling.
- `src/elements/` contains framework-neutral Web Components with Shadow DOM style isolation.
- `dist/design-tokens.css`, `dist/viking-components.css`, `dist/deml-components.css`, `dist/viking-ui.css`, `dist/viking-tokens.json`, and `dist/viking-ui-elements.js` are the built artifacts.
- `dist/viking-ui.css` is the full app bundle. Load it once per surface; do not stack it with the split CSS artifacts.

## Build

```bash
npm run build --prefix packages/viking-ui
```

## Consumption

```html
<link rel="stylesheet" href="/assets/viking-ui.css" />
<script type="module" src="/assets/viking-ui-elements.js"></script>
```

```ts
import "@dataengineeringformachinelearning/viking-ui/elements.js";
import "@dataengineeringformachinelearning/viking-ui/viking-ui.css";
```

This package is the source of truth. Existing Angular wrappers in `frontend/projects/viking-ui` adapt the design system for Angular while migration continues; Astro and Django consume the package artifacts directly through synced static assets.

Angular app shells consume the package CSS from `angular.json`:

```json
{
  "styles": ["../packages/viking-ui/dist/viking-ui.css", "src/styles.scss"]
}
```

Django, marketing, and showcase static assets are copied from `packages/viking-ui/dist` by:

```bash
python scripts/sync_design_system.py
node scripts/validate_viking_ui_assets.mjs
```

See [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) for the rebuild phases.
