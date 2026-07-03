# Viking-UI Documentation Site

Standalone [spartan.ng](https://spartan.ng)-style documentation site for the `@dataengineeringformachinelearning/viking-ui` Angular component library.

**Live site:** [ui.dataengineeringformachinelearning.com](https://ui.dataengineeringformachinelearning.com/)

**This site is not part of deml.app.** It deploys to Firebase Hosting site `deml-ui` (target `deml-ui`).

## Architecture

| Path                           | Purpose                                                   |
| ------------------------------ | --------------------------------------------------------- |
| `viking-ui-docs/`              | Doc site (this folder) — landing + component browser      |
| `frontend/projects/viking-ui/` | Publishable library source (consumed by deml.app and npm) |
| `packages/deml-design-system/` | Shared THEME.md tokens                                    |

The main DEML app imports Viking-UI via `file:dist/viking-ui`. This docs site resolves the library from `../frontend/projects/viking-ui/src/public-api.ts` via TypeScript path mapping (single Angular compilation graph — avoids duplicate `@angular/core` DI failures).

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

**CI secret (required once):** add repository secret `FIREBASE_SERVICE_ACCOUNT_DEML_UI` with the full JSON for `firebase-adminsdk-fbsvc@deml-ui.iam.gserviceaccount.com`. Never commit service account keys to the repo.

Manual deploy:

```bash
npm run build:viking-ui --prefix frontend
npm run build --prefix viking-ui-docs
firebase deploy --only hosting:deml-ui --project deml-ui
```

**Production URL:** `https://ui.dataengineeringformachinelearning.com/` (custom domain on Firebase site `deml-ui`).

## Routes

| Route         | Page                                              |
| ------------- | ------------------------------------------------- |
| `/`           | Introduction landing                              |
| `/components` | Full-width component browser with section anchors |

## Publish library to npm

The library itself is published separately — see `frontend/projects/viking-ui/README.md` and the `publish-viking-ui.yml` workflow.
