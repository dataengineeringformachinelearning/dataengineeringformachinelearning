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
frontend/projects/viking-ui/
├── packages/viking-ui/src/styles/_variables.scss   ← edit tokens here first
├── src/lib/                     ← Angular components
├── packages/viking-ui/src/web/  ← Web Components (viking-*-wc)
├── src/public-api.ts            ← export surface
└── viking.manifest.json         ← machine-readable catalog
```

## Build commands

```bash
# From repo root
npm run build:viking-ui --prefix frontend
npm run build:viking-ui:package --prefix ../..
python scripts/sync_design_system.py
cd frontend && npm run test:viking-ui
cd frontend && npm run check:viking-upstream
```

## Adding a component (summary)

1. Token-only SCSS in `packages/viking-ui/src/styles/`
2. Optional Web Component in `packages/viking-ui/src/web/` (`viking-{name}-wc`)
3. Angular wrapper in `src/lib/` with signal `input()` / `output()`
4. Export from `public-api.ts` + entry in `viking.manifest.json`
5. Showcase demo in `viking-ui-docs/src/lib/component-registry.ts`

See the root [CONTRIBUTING.md](../../CONTRIBUTING.md) for the complete checklist.
