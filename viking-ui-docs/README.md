# Viking-UI Docs

Premium Astro showcase for the `@dataengineeringformachinelearning/viking-ui` design system — the canonical open-source documentation site for community adoption and contributions.

**Production URL:** [ui.dataengineeringformachinelearning.com](https://ui.dataengineeringformachinelearning.com)

## What this site provides

| Route                | Purpose                                               |
| -------------------- | ----------------------------------------------------- |
| `/`                  | Landing page with live Web Component previews         |
| `/components`        | Interactive gallery with multi-framework snippets     |
| `/components/[slug]` | Per-component detail pages with API reference         |
| `/playground`        | Live Storybook-style playground (button + input)      |
| `/architecture`      | Universal three-layer architecture guide              |
| `/tokens`            | Searchable token inspector                            |
| `/theming`           | Theming and customization guide                       |
| `/frameworks`        | Angular, Astro, Django, Web Component setup           |
| `/contributing`      | Contribution workflow (links to root CONTRIBUTING.md) |

## Repository layout

| Path                           | Role                                                                             |
| ------------------------------ | -------------------------------------------------------------------------------- |
| `viking-ui-docs/`              | Astro showcase + static CSS build entrypoint (build assets from package)         |
| `viking-ui-docs/src/`          | Astro pages, component registry, token inspector                                 |
| `packages/viking-ui/`          | Canonical library, Web Components, SCSS source, and package metadata             |
| `frontend/projects/viking-ui/` | Angular wrappers (thin surface layer); shared source is in `packages/viking-ui/` |
| `CONTRIBUTING.md`              | Root contribution guidelines                                                     |

## Local development

```bash
# From repo root
npm run start:viking-ui-docs

# Or from this directory
npm ci --legacy-peer-deps
npm run dev   # port 4300
```

Static CSS is rebuilt automatically via `predev` / `prebuild` hooks.

## Adding component demos

1. Edit `src/lib/component-registry.ts` or add a focused registry extension module
   with helpers from `src/lib/component-registry-kit.ts`
2. Add API reference in `src/lib/component-api.ts` for documented props
3. Detail page auto-generates at `/components/[slug]`
4. Verify in dev server and playground if applicable

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the full checklist.

## Release and stability checks

See [docs/viking-ui-release.md](../docs/viking-ui-release.md) for the
Changesets versioning flow, visual regression commands, CI checks, and
cross-app asset propagation steps.

## Static CSS build

`npm run build:static-css` compiles SCSS from the library into `public/assets/` and `dist/static-css/`.

```bash
npm run build:static-css          # from viking-ui-docs/
python ../scripts/sync_design_system.py   # fan-out to all surfaces
```

## Deploy

Firebase Hosting site **`deml-ui`** — not marketing or deml.app.

## Stack

- **Astro 7** for static documentation
- **viking-ui.css** + **viking-ui-elements.js** for live previews
- **jsDelivr CDN alternative**: `https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@latest/dist/viking-ui.css` and `https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@latest/dist/web-components.js`
- Token-only SCSS in `src/styles/` — no hardcoded hex

Port **4300** by default.
