# Contributing to `@dataengineeringformachinelearning/viking-ui`

This package is the canonical Viking-UI library. For the full contribution guide — setup, quality gates, component checklist, and coding standards — see the repository root:

**[CONTRIBUTING.md](../../CONTRIBUTING.md)**

## Quick links

| Topic                  | Location                                                   |
| ---------------------- | ---------------------------------------------------------- |
| Live docs & playground | Local Storybook / Chromatic (public `ui.deml.app` retired) |
| Architecture           | `THEME.md` + `BOOK.md` Chapter 32                          |
| Theming                | `THEME.md` / suite tokens                                  |
| Component gallery      | `npm run storybook` in `packages/viking-ui`                |
| Token reference        | [THEME.md](../../THEME.md)                                 |

## Library-specific paths

```text
packages/viking-ui/
├── src/styles/_variables.scss    ← edit tokens here first
├── src/core/                    ← framework-neutral registries/utilities
├── src/lib/                     ← Angular components and wrappers
├── src/web/                     ← Web Components (viking-*-wc)
├── src/web-components/          ← Web Component bundle entry
├── src/public-api.ts            ← Angular/root export surface
├── package.json                 ← npm/CDN subpath exports
├── viking.manifest.json         ← machine-readable catalog
└── README/CONTRIBUTING/LICENSE  ← package metadata
```

## Build commands

```bash
# From repo root
npm run build:viking-ui:package
python scripts/sync_design_system.py
npm run test:viking-ui:package
npm run pack:viking-ui
```

## Naming & imports

| Kind              | Convention                     | Example                                    |
| ----------------- | ------------------------------ | ------------------------------------------ |
| Selector          | `viking-*`                     | `viking-button`, `viking-modal`            |
| Class / type      | `Viking*`                      | `VikingButton`, `VikingVirtualWindow`      |
| Pure core helpers | camelCase / shared suite names | `vikingUid`, `NativeDialogSession`         |
| Angular folder    | `src/lib/<name>/<name>.ts`     | `confirm-dialog/confirm-dialog.service.ts` |
| Framework-neutral | `src/core/`                    | `field-a11y.ts`, `dialog-session.ts`       |
| Web Components    | `src/web/`                     | `web/core/dom.ts`                          |

Import order in a file: `@angular/*` → third-party → `../../core` / relatives → local `./`, with `import type` for type-only symbols.

## Adding a component (summary)

1. Token-only SCSS in `packages/viking-ui/src/styles/`
2. Optional Web Component in `packages/viking-ui/src/web/` (`viking-{name}-wc`)
3. Angular wrapper in `src/lib/` with signal `input()` / `output()`
4. Export from `public-api.ts`, add subpath exports in `package.json` when needed, and update `viking.manifest.json`
5. Showcase demo in `viking-ui-docs/src/lib/component-registry.ts`

See the root [CONTRIBUTING.md](../../CONTRIBUTING.md) for the complete checklist.
