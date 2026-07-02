# Flux-Material Showcase

Standalone Angular application for browsing and validating every component in
`@deml/flux-material`. This gallery is **not** part of deml.app — it ships as
its own static bundle for design-system review, visual regression, and
downstream consumers evaluating the library.

## Development

From `frontend/`:

```bash
npm run serve:flux-material-showcase   # http://localhost:4200 (default port)
```

## Build

```bash
npm run build:flux-material-system
```

This builds the publishable library (`dist/flux-material`) and the showcase
app (`dist/flux-material-showcase`) in one step.

Individual targets:

```bash
npm run build:flux-material            # library only (ng-packagr APF bundle)
npm run build:flux-material-showcase   # gallery app only
```

## Packaging

The component system is `@deml/flux-material` under `projects/flux-material/`.
The showcase app consumes it via the same TypeScript path alias as the main
DEML frontend (`@deml/flux-material` → source during dev, built package when
published).

To publish the library:

```bash
npm run build:flux-material
cd dist/flux-material && npm publish
```

Deploy the showcase static output separately (Firebase Hosting, Cloudflare
Pages, etc.) — never on deml.app.
