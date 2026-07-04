# Viking-UI Documentation Site

Premium Astro showcase for the `@dataengineeringformachinelearning/viking-ui` design system.

**Live site:** [ui.dataengineeringformachinelearning.com](https://ui.dataengineeringformachinelearning.com/)

Built with **Astro** + universal Viking-UI (**CSS + Web Components**). Deploys to Firebase Hosting site `deml-ui`.

## Architecture

| Path | Purpose |
| ---- | ------- |
| `viking-ui-docs/` | Astro showcase + **static CSS build owner** |
| `viking-ui-docs/src/` | Astro pages, component registry, token inspector |
| `frontend/projects/viking-ui/` | Canonical library + SCSS source |

Static CSS for marketing, backend, and widgets is built here via `npm run build:static-css`, then fan-copied by `python scripts/sync_design_system.py`.

## Features

- Dark mode by default with light/dark theme toggle
- Interactive component gallery with live Web Component previews
- Multi-framework code snippets (Angular, Astro, Django, Web Components)
- Copy-to-clipboard on every snippet
- Token inspector with search and semantic alias reference
- Framework integration guides and open-source contribution workflow

## Development

```bash
# From repo root — starts Astro dev server on http://localhost:4300
npm run start:viking-ui-docs

# Or from this directory
npm run dev
```

Pre-dev/pre-build automatically runs `build:static-css` to compile tokens and Web Components.

## Build static CSS (marketing / backend / widgets)

```bash
npm run build:static-css          # from viking-ui-docs/
python scripts/sync_design_system.py   # from repo root
```

## Build docs site

```bash
npm run build:viking-ui-docs   # from repo root
# or
npm run build                  # from viking-ui-docs/
```

Output: `viking-ui-docs/dist/` (static Astro site).

## Deploy

Merges to `main` that touch `viking-ui-docs/` or the library trigger `.github/workflows/firebase-viking-ui-docs-deploy.yml`.

Manual deploy:

```bash
npm run build --prefix viking-ui-docs
firebase deploy --only hosting:deml-ui --project deml-ui
```

## Routes

| Route | Page |
| ----- | ---- |
| `/` | Introduction landing with live preview |
| `/components` | Full component gallery with code snippets |
| `/tokens` | Token inspector |
| `/frameworks` | Usage in Angular, Astro, Django, Web Components |
| `/contributing` | Contribution guidelines and GitHub links |

## Adding component demos

Edit `src/lib/component-registry.ts` — add preview HTML and snippets per framework. The gallery at `/components` renders automatically.

## Publish library to npm

See `frontend/projects/viking-ui/README.md` and the `publish-viking-ui.yml` workflow.
