# @dataengineeringformachinelearning/viking-ui

## 9.3.0

### Minor Changes

- Component updates

## 9.2.0

### Minor Changes

- Component changes

## 9.1.0

### Minor Changes

- Add semantic `viking-panel-grid` and `viking-form-grid` layout recipes so peer
  surfaces inherit equal-height behavior and related fields inherit responsive
  top alignment without application-specific layout fixes.
- Componenet handling

## 9.0.0

### Major Changes

- Component updates

## 8.1.0

### Minor Changes

- Adjust components

## 8.0.0

### Major Changes

- Overhaul componenets

## 6.4.0

### Minor Changes

- Update componenet layout

## 6.3.0

### Minor Changes

- Chart updates

## 6.2.0

### Minor Changes

- Component enhancement
- Add intrinsic auto-fit grids and the `viking-switcher` Angular layout primitive,
  with equal-height card action alignment, 8px-grid minimum sizes, Storybook
  coverage, and hosted visual documentation.

## Unreleased

### Minor Changes

- Add reusable Angular page shell, section, stack, responsive grid, and cluster
  layout primitives backed by the canonical Viking-UI layout classes.
- Promote the precision display-heading treatment across the Viking-UI showcase
  and render release identity from package metadata instead of stale page copy.

## 6.1.0

### Minor Changes

- Sweeping component updates

## 6.0.0

### Major Changes

- Interlocked suite navigation now shares authenticated state across Angular,
  Astro, Django, and framework-neutral Web Component surfaces.
- Navigation, footer, command palette, and call-to-action contracts now update
  together after sign-in, sign-out, and one-time session handoff events.

## 5.2.0

### Minor Changes

- Component styling

## 5.1.0

### Minor Changes

- Component styling

## 5.0.0

### Major Changes

- Style effectively 8px

## 4.11.0

### Minor Changes

- Update components

## 4.10.0

### Minor Changes

- Component upgrades

## 4.9.0

### Minor Changes

- Component cleanup

## 4.8.0

### Minor Changes

- UI polish: Flux-like charts, page mockups, Algolia suite search, Swagger theme, form/MFA fixes, reactive WC base

## 4.7.0

### Minor Changes

- Cleanup UI elements

## 4.6.0

### Minor Changes

- Cleanup components

## 4.5.0

### Minor Changes

- Enhance spacing in components

## 4.4.0

### Minor Changes

- Reform dashboard

## 4.3.1

### Patch Changes

- Cleanup buttons

## 4.3.0

### Minor Changes

- Update mobile to desktop

## 4.2.0

### Minor Changes

- Cleanup components

## 4.1.0

### Minor Changes

- Make Viking-UI the single source of truth for DEML styling, adding status/site primitives and package-owned surface styles for Angular, marketing, docs, and widgets.

## 4.0.6

### Patch Changes

- Fix navbar Sign In icon alignment and remove auth-button loading flash on page load.
- Hide mobile menu toggle on desktop and close mobile menu on outside click (Shadow DOM safe).
- Sync cross-site auth session state: Dashboard + Sign Out on static navbars, trusted iframe origins, and localStorage storage events.
- Remove deprecated brand language from theme and docs copy.

## 4.0.5

### Patch Changes

- Prepare the package for npm publishing with the consolidated `packages/viking-ui/`
  source of truth, clean package files, public CSS/Web Component utility exports,
  and package validation for npm dry runs.
- Lock the polished DEML premium restrained luxury aesthetic into Storybook:
  token-only battlefield backgrounds, machined card surfaces, generous spacing,
  core Web Component coverage, and Chromatic mobile/tablet/desktop snapshots.
- Update the UI showcase and release docs to describe the publishing workflow:
  Changesets versioning, package build/test, Storybook build, Chromatic visual
  regression, npm publish, asset sync, and showcase deployment.

## 4.0.3

### Patch Changes

- 4f1c9c2: Normalize package exports so Angular consumers, Web Component consumers, and CSS CDN consumers all share predictable, explicit public entrypoints (`.`, `./angular`, `./css`, `./web-components`, `./elements`, `./widget`).
- 9d2a1ae: Align package metadata and docs for npm/jsDelivr release readiness (`dist/index.d.ts`, version pin examples, and polished v4.0.3 release notes).

## 4.0.2

### Patch Changes

- 02277c9: Finalize npm-first consumption for Viking-UI in Angular and Astro, and update docs to recommend npm + jsDelivr workflows while keeping sync scripts for Django/static-first surfaces.
- 1932d36: Add package stability checks, Changesets versioning, and showcase visual regression coverage for Viking-UI.
