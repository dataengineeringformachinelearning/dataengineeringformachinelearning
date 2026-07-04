# Viking-UI Documentation Site

Standalone documentation site for the `@dataengineeringformachinelearning/viking-ui` Angular component library.

**Live site:** [ui.dataengineeringformachinelearning.com](https://ui.dataengineeringformachinelearning.com/)

**This site is not part of deml.app.** It deploys to Firebase Hosting site `deml-ui` (target `deml-ui`).

## Architecture

| Path | Purpose |
| ---- | ------- |
| `viking-ui-docs/` | Doc site + **static CSS build owner** (`design-tokens.css`, `deml-components.css`, `viking-ui.css`) |
| `frontend/projects/viking-ui/` | Canonical library + SCSS source (tokens, components, navbar, page shell) |

Static CSS for marketing, backend, and widgets is built here via `npm run build:static-css`, then fan-copied by `python scripts/sync_design_system.py`.

The main DEML app imports Viking-UI via `file:dist/viking-ui`. This docs site resolves the library from `../frontend/dist/viking-ui` after `npm run build:viking-ui`.

## Development

```bash
# From repo root — builds library then starts docs on http://localhost:4300
npm run start:viking-ui-docs

# Or from this directory
npm run start
```

## Build static CSS (marketing / backend / widgets)

```bash
npm run build:static-css          # from viking-ui-docs/
python scripts/sync_design_system.py   # from repo root — copies to all surfaces
```

Output: `viking-ui-docs/dist/static-css/` and `viking-ui-docs/public/assets/`.

## Build docs site

```bash
npm run build:viking-ui-docs   # from repo root
# or
npm run build                  # from viking-ui-docs/ (runs build:static-css in prebuild)
```

Output: `viking-ui-docs/dist/browser/` (static SPA).

## Deploy

Merges to `main` that touch `viking-ui-docs/` or the library trigger `.github/workflows/firebase-viking-ui-docs-deploy.yml`.

Manual deploy:

```bash
npm run build:viking-ui --prefix frontend
npm run build --prefix viking-ui-docs
firebase deploy --only hosting:deml-ui --project deml-ui
```

## Routes

| Route | Page |
| ----- | ---- |
| `/` | Introduction landing |
| `/components` | Full-width component browser with section anchors |

## Publish library to npm

See `frontend/projects/viking-ui/README.md` and the `publish-viking-ui.yml` workflow.
