# Viking-UI Release And Propagation

Viking-UI is versioned from the canonical package at `packages/viking-ui`.
Every library change should carry a Changeset, prove the package can build,
and verify the showcase before changes are fanned out to the apps.

## Everyday Update Flow

1. Edit source in `packages/viking-ui/src`.
2. Add or update showcase entries in `viking-ui-docs/src/lib/component-registry.ts`
   or a focused registry extension module.
3. Add a Changeset:

   ```bash
   npm run changeset
   ```

4. Build and test the package:

   ```bash
   npm run test:viking-ui:package
   ```

5. Build the docs showcase:

   ```bash
   npm run build:viking-ui-docs
   ```

6. Run visual regression checks:

   ```bash
   npm run test:viking-ui:visual
   ```

   When an intentional visual change is approved, refresh baselines with:

   ```bash
   npm run test:visual:update --workspace viking-ui-docs
   ```

## Propagating Built Assets

The package build writes CSS, tokens, fonts, and custom elements to
`packages/viking-ui/dist`. Fan those artifacts out to Django, marketing,
the Angular frontend assets, and the showcase with:

```bash
python scripts/sync_design_system.py
node scripts/validate_viking_ui_assets.mjs
```

The sync script builds the package first, copies `viking-ui.css`,
`design-tokens.css`, `viking-components.css`, `deml-components.css`,
`viking-ui-elements.js`, and `viking-tokens.json`, then validates that all
consumer surfaces received the same artifact bytes.

## Versioning And Publishing

Use Changesets for SemVer:

```bash
npm run changeset
npm run version:viking-ui
npm run publish:viking-ui
```

Choose `patch` for compatible fixes, `minor` for new components or props, and
`major` for breaking selectors, exports, token contracts, or behavior.

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
