# Viking-Material Showcase

Standalone Angular application for browsing and validating every component in
`@dataengineeringformachinelearning/viking-ui`. This gallery is **not** part of deml.app — it ships as
its own static bundle for design-system review, visual regression, and
downstream consumers evaluating the library.

## Development

From `frontend/`:

```bash
npm run serve:viking-ui-showcase   # http://localhost:4200 (default port)
```

## Build

```bash
npm run build:viking-ui-system
```

This builds the publishable library (`dist/viking-ui`) and the showcase
app (`dist/viking-ui-showcase`) in one step.

Individual targets:

```bash
npm run build:viking-ui            # library only (ng-packagr APF bundle)
npm run build:viking-ui-showcase   # gallery app only
```

## Packaging

The component system is `@dataengineeringformachinelearning/viking-ui` under `projects/viking-ui/`.
The showcase app consumes it via the same TypeScript path alias as the main
DEML frontend (`@dataengineeringformachinelearning/viking-ui` → source during dev, built package when
published).

To publish the library:

```bash
npm run build:viking-ui
cd dist/viking-ui && npm publish
```

Deploy the showcase static output separately (Firebase Hosting, Cloudflare
Pages, etc.) — never on deml.app.
