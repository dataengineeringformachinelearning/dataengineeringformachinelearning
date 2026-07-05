# Contributing to `@dataengineeringformachinelearning/viking-ui`

This package is the canonical Viking-UI library. For the full contribution guide — setup, quality gates, component checklist, and coding standards — see the repository root:

**[CONTRIBUTING.md](../../CONTRIBUTING.md)**

## Quick links

| Topic                  | Location                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| Live docs & playground | [ui.dataengineeringformachinelearning.com](https://ui.dataengineeringformachinelearning.com) |
| Architecture           | [/architecture](https://ui.dataengineeringformachinelearning.com/architecture)               |
| Theming                | [/theming](https://ui.dataengineeringformachinelearning.com/theming)                         |
| Component gallery      | [/components](https://ui.dataengineeringformachinelearning.com/components)                   |
| Token reference        | [THEME.md](../../THEME.md)                                                                   |

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

## Adding a component (summary)

1. Token-only SCSS in `packages/viking-ui/src/styles/`
2. Optional Web Component in `packages/viking-ui/src/web/` (`viking-{name}-wc`)
3. Angular wrapper in `src/lib/` with signal `input()` / `output()`
4. Export from `public-api.ts`, add subpath exports in `package.json` when needed, and update `viking.manifest.json`
5. Showcase demo in `viking-ui-docs/src/lib/component-registry.ts`

See the root [CONTRIBUTING.md](../../CONTRIBUTING.md) for the complete checklist.
