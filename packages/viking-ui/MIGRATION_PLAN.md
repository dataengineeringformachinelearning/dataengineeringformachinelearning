# Viking-UI Rebuild Plan

## 1. Establish The Universal Package

- Make `packages/viking-ui` the source of truth for tokens, static CSS, and Web Components.
- Build these artifacts from one command:
  - `dist/design-tokens.css`
  - `dist/viking-components.css`
  - `dist/viking-ui.css`
  - `dist/index.js`
  - `dist/viking-ui-elements.js`
  - `dist/index.d.ts`
- Keep all visual decisions in `--viking-*` custom properties.
- Use Shadow DOM for interactive primitives that must behave identically in Astro, Angular, and Django.

## 2. Define The Core Primitive Set

- Shell: page wrapper, app header, site nav, sidebar, footer.
- Actions: button, icon button, segmented control, menu.
- Surfaces: card, panel, metric card, callout, modal, sheet.
- Forms: field, input, textarea, select, checkbox, radio, switch.
- Data: table, badge, progress, skeleton, native SVG chart.
- Navigation/search: tabs, breadcrumbs, command/search palette.

## 3. Migrate Consumers

- Astro marketing and showcase load `packages/viking-ui/dist/viking-ui.css` plus `viking-ui-elements.js`.
- Django templates and Swagger load the same static CSS and element bundle from collected static assets.
- Angular keeps framework wrappers where they add typed APIs, forms integration, or signals, but consumes the new package tokens and element behavior.

## 4. Retire Duplicate Sources

- Legacy style ownership has moved into canonical sources in `packages/viking-ui`.
- Remove `packages/deml-design-system` after all surfaces consume the universal package.
- Collapse ad-hoc marketing/backend CSS into tokenized primitives or app-local layout only.

## 5. Quality Gates

- Build: `npm run build:viking-ui:universal`.
- Theme enforcement: `node scripts/enforce-theme.js`.
- Accessibility: `node scripts/run_axe.js`.
- Angular library coverage: `npm run test:viking-ui --prefix frontend`.
- Visual QA with desktop and mobile screenshots for the search modal, headers, and cramped layouts.
