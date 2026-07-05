# Viking-UI Docs — Agent Notes

This is the **standalone Astro showcase** for Viking-UI. Do not merge this into deml.app routes.

## Conventions

- Read `THEME.md` before editing styles or components.
- Canonical library source (styles/tokens/web components and Angular wrappers) lives in `../packages/viking-ui/`.
- This app **demonstrates** library primitives via CSS + Web Components; keep demo pages thin.
- Component registry: `src/lib/component-registry.ts`
- Deploy via Firebase Hosting site **`deml-ui`**, not marketing or deml.app.
- **Production URL:** [ui.dataengineeringformachinelearning.com](https://ui.dataengineeringformachinelearning.com/)

## Local dev

```bash
npm run start:viking-ui-docs   # from repo root
# or
npm run dev                    # from viking-ui-docs/ — port 4300
```

## Static CSS build owner

`npm run build:static-css` compiles SCSS from the library into `public/assets/` and `dist/static-css/`. Run before dev/build automatically via pre-scripts.

## Stack

- **Astro 7** for static documentation/showcase
- **viking-ui.css** + **viking-ui-elements.js** for live previews
- Token-only SCSS in `src/styles/` — no hardcoded hex

Port **4300** by default.
