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
npm run test:viking-ui:package
```

## Versioning

Viking-UI uses Changesets from the repository root:

```bash
npm run changeset
npm run version:viking-ui
```

See [docs/viking-ui-release.md](../../docs/viking-ui-release.md) for the full
release, visual regression, and propagation workflow.

## Consumption

### 1) NPM usage (recommended for apps)

Use this for app-first surfaces such as deml.app, internal dashboards, and any build chain that supports package installs.

```ts
import "@dataengineeringformachinelearning/viking-ui/viking-ui.css";
```

```ts
import {
  VikingButton,
  VikingInput,
  VikingModal,
} from "@dataengineeringformachinelearning/viking-ui";
```

```bash
npm install @dataengineeringformachinelearning/viking-ui
```

For Angular components, continue using the exported Angular APIs and theme tokens as normal.

```ts
import {
  VikingButton,
  VikingInput,
  VikingModal,
} from "@dataengineeringformachinelearning/viking-ui";

// or when building custom element demos:
import "@dataengineeringformachinelearning/viking-ui/web-components.js";
import "@dataengineeringformachinelearning/viking-ui/viking-ui.css";
```

### 2) jsDelivr CDN usage (recommended for widgets and quick embeds)

Use this for external websites, marketing snippets, and widget-style integrations that should load without npm.

The package artifacts are published in `dist/`, so you can load them directly from jsDelivr:

### 1) CSS only

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@latest/dist/viking-ui.css"
/>
```

### 2) Web Components only

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@latest/dist/web-components.js"
></script>
```

### 3) CSS + Web Components together

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@latest/dist/viking-ui.css"
/>
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@latest/dist/web-components.js"
></script>
```

### 4) Version pinning

Use `@latest` for latest stable assets, or replace it with a concrete version for locked
builds.

```html
<!-- Latest -->
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@latest/dist/viking-ui.css"
/>
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@latest/dist/web-components.js"
></script>
```

```html
<!-- Pinned -->
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@3.0.0-alpha.3/dist/viking-ui.css"
/>
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@3.0.0-alpha.3/dist/web-components.js"
></script>
```

### 5) Full minimal HTML example (copy/paste)

```html
<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Viking-UI CDN demo</title>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@latest/dist/viking-ui.css"
    />
    <script
      type="module"
      src="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@latest/dist/web-components.js"
    ></script>
  </head>
  <body>
    <main
      style="max-width: 680px; margin: 2rem auto; display: grid; gap: 1rem;"
    >
      <h1 class="viking-heading viking-heading-xl">Viking widget</h1>
      <viking-card-wc compact>
        <h2 class="viking-heading viking-heading-sm">Widget card</h2>
        <p class="viking-text-muted">
          Works in marketing pages and external websites.
        </p>
      </viking-card-wc>
      <viking-button-wc variant="primary">Open dashboard</viking-button-wc>
    </main>
  </body>
</html>
```

### 3) When to use the sync script

Use `scripts/sync_design_system.py` when you need synced static assets instead of npm:

```bash
python scripts/sync_design_system.py
```

This path remains for surfaces that are not using package installs directly, especially
legacy or Django-rendered templates that consume `/assets/viking-ui.css` and shared class names.

### 6) Status widget via jsDelivr (no npm install)

Use this when embedding a live status badge on external pages:

```html
<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>DEML Status Widget</title>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@latest/dist/viking-ui.css"
    />
    <script
      type="module"
      src="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@latest/dist/web-components.js"
    ></script>
    <script
      src="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@latest/dist/widget.js"
      async
      defer
      data-page-id="platform-status"
      data-backend-url="https://api.example.com"
      data-frontend-url="https://deml.app"
    ></script>
  </head>
  <body></body>
</html>
```

Pinned release example:

```html
<script
  src="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@3.0.0-alpha.3/dist/widget.js"
  async
  defer
  data-page-id="platform-status"
  data-backend-url="https://api.example.com"
  data-frontend-url="https://deml.app"
></script>
```

Replace `api.example.com` with your backend URL and update `data-page-id` / `data-frontend-url` for your status page.

This package is the source of truth. Angular wrappers in `frontend/projects/viking-ui` adapt the design system for Angular while canonical source files and token/build artifacts remain in `packages/viking-ui`; Astro and Django consume the package artifacts directly through synced static assets.

Angular app shells consume the package CSS from `angular.json`:

```json
{
  "styles": [
    "@dataengineeringformachinelearning/viking-ui/viking-ui.css",
    "src/styles.scss"
  ]
}
```

Django, marketing, and showcase static assets are copied from `packages/viking-ui/dist` by:

```bash
python scripts/sync_design_system.py
node scripts/validate_viking_ui_assets.mjs
```

See [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) for the rebuild phases.
