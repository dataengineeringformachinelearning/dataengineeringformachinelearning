# Viking-UI Documentation Site

Standalone [spartan.ng](https://spartan.ng)-style documentation site for the `@dataengineeringformachinelearning/viking-ui` Angular component library.

**This site is not part of deml.app.** It deploys to Firebase Hosting site `deml-ui` (target `deml-ui`).

## Architecture

| Path                           | Purpose                                                   |
| ------------------------------ | --------------------------------------------------------- |
| `viking-ui-docs/`              | Doc site (this folder) — landing + component browser      |
| `frontend/projects/viking-ui/` | Publishable library source (consumed by deml.app and npm) |
| `packages/deml-design-system/` | Shared THEME.md tokens                                    |

The main DEML app imports Viking-UI via `file:dist/viking-ui`. This docs site imports the same library for live previews.

## Development

```bash
# From repo root — builds library then starts docs on http://localhost:4300
npm run start:viking-ui-docs

# Or from this directory
npm run start
```

## Build

```bash
npm run build:viking-ui-docs   # from repo root
# or
npm run build                  # from viking-ui-docs/
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

Configure a custom domain (e.g. `ui.dataengineeringformachinelearning.com`) in the Firebase console for the **`deml-ui`** site.

## Routes

| Route         | Page                                              |
| ------------- | ------------------------------------------------- |
| `/`           | Introduction landing                              |
| `/components` | Full-width component browser with section anchors |

## Publish library to npm

The library itself is published separately — see `frontend/projects/viking-ui/README.md` and the `publish-viking-ui.yml` workflow.
