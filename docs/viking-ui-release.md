# Viking-UI Release And Propagation

Viking-UI is versioned from the canonical package at `packages/viking-ui`.
That package is the single source of truth for token SCSS, static CSS bundles,
framework-neutral Web Components, utility subpaths, package metadata, and
Angular wrappers.
Every library change should carry a Changeset, prove the package can build,
and verify the showcase before changes are fanned out to the apps.

## Everyday Update Flow

1. Edit source in `packages/viking-ui/src`: `src/styles/` for tokens and CSS,
   `src/web/` for Web Components, `src/core/` for framework-neutral utilities,
   and `src/lib/` for Angular wrappers.
2. Add or update showcase entries in `viking-ui-docs/src/lib/component-registry.ts`
   or a focused registry extension module.
3. Update exports when needed:
   - `packages/viking-ui/src/public-api.ts` for Angular/root APIs.
   - `packages/viking-ui/package.json` for public subpaths such as `/icons`,
     `/site-drakkar`, `/tokens.json`, `/manifest`, `/web-components.js`, and
     `/widget`.
4. Add a Changeset:

   ```bash
   npm run changeset
   ```

5. Build and test the package:

   ```bash
   npm run test:viking-ui:package
   npm run pack:viking-ui
   ```

6. Build the package Storybook:

   ```bash
   npm run build-storybook --workspace @dataengineeringformachinelearning/viking-ui
   ```

7. Build the docs showcase:

   ```bash
   npm run build:viking-ui-docs
   ```

8. Run visual regression checks:

   ```bash
   npm run test:viking-ui:visual
   ```

   When an intentional visual change is approved, refresh baselines with:

   ```bash
     npm run test:visual:update --workspace viking-ui-docs
   ```

9. Publish Storybook snapshots to Chromatic when `CHROMATIC_PROJECT_TOKEN` is
   available:

   ```bash
   npm run chromatic --workspace @dataengineeringformachinelearning/viking-ui
   ```

## Propagating Built Assets

The package build writes CSS, tokens, fonts, custom elements, widgets, and
framework-neutral utility bundles to `packages/viking-ui/dist`. Fan those
artifacts out to Django, marketing, the Angular frontend assets, and the
showcase with:

```bash
python scripts/sync_design_system.py
node scripts/validate_viking_ui_assets.mjs
```

The sync script builds the package first, copies `viking-ui.css`,
`design-tokens.css`, `viking-components.css`, `deml-components.css`,
`viking-ui-elements.js`, widget assets, and `viking-tokens.json`, then validates
that all consumer surfaces received the same artifact bytes. npm/CDN consumers
should use the published package entrypoints directly rather than synced assets.

## Versioning And Publishing

Use Changesets for SemVer:

```bash
npm run changeset
npm run version:viking-ui
npm run publish:viking-ui
```

Choose `patch` for compatible fixes, `minor` for new components or props, and
`major` for breaking selectors, exports, token contracts, or behavior.

Before publishing, verify that the local version does not already exist on npm:

```bash
npm view @dataengineeringformachinelearning/viking-ui@$(node -p "require('./packages/viking-ui/package.json').version") version
```

If npm returns a version, bump the package before publishing. The current
publish target is `4.1.5`.

The publish workflow performs the release in this order:

1. Validate `NPM_TOKEN`.
2. Run `npm audit --audit-level=high`.
3. Build `packages/viking-ui`.
4. Apply Changesets versioning and publish to npm.
5. Build Storybook and publish Chromatic snapshots when
   `CHROMATIC_PROJECT_TOKEN` is configured.
6. Sync canonical design-system assets.
7. Build and optionally deploy the Viking-UI showcase.

Chromatic is configured from the package Storybook. It builds
`packages/viking-ui/storybook-static`, captures mobile/tablet/desktop widths,
and uses `--exit-zero-on-changes` so approved visual changes can proceed while
still leaving a reviewable snapshot trail.

## Extending The Showcase Registry

Use `viking-ui-docs/src/lib/component-registry-kit.ts` helpers for new batches:

```ts
import {
  defineShowcaseComponent,
  defineShowcaseCategory,
  defineSnippets,
} from "./component-registry-kit";

export const NEW_CATEGORIES = [
  defineShowcaseCategory({
    id: "new-category",
    label: "New Category",
    description: "Short category summary.",
    components: [
      defineShowcaseComponent(
        {
          id: "new-component",
          name: "New component",
          description: "What this component does.",
          preview: "<viking-new-component-wc></viking-new-component-wc>",
          selector: "viking-new-component",
          wcSelector: "viking-new-component-wc",
        },
        defineSnippets(
          "<viking-new-component />",
          "<viking-new-component-wc></viking-new-component-wc>",
          '<div class="viking-new-component"></div>',
          'document.createElement("viking-new-component-wc");',
        ),
      ),
    ],
  }),
];
```

Register the category array in `component-registry.ts`. The composed registry
throws during build if category ids or component ids are duplicated.
