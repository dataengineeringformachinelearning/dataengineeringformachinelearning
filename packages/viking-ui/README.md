# Viking-UI

Universal DEML component library for Astro, Angular, and Django.

## Architecture

- `src/styles/tokens.scss` defines the canonical `--viking-*` design tokens.
- `src/styles/components.scss` defines static CSS primitives shared by every app.
- `src/elements/` contains framework-neutral Web Components with Shadow DOM style isolation.
- `dist/design-tokens.css`, `dist/viking-components.css`, `dist/viking-ui.css`, and `dist/viking-ui-elements.js` are the built artifacts consumed by apps.

## Build

```bash
npm run build --prefix packages/viking-ui
```

This package is the new source of truth. Existing Angular wrappers in `frontend/projects/viking-ui` should migrate toward consuming these tokens, styles, and custom elements instead of owning independent design primitives.

See [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) for the rebuild phases.
