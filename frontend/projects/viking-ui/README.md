# @dataengineeringformachinelearning/viking-ui

**Viking-UI** is DEML's premium Angular design system — dark-first engineering aesthetics with luxurious minimalism. Visual tokens are defined in the canonical **[THEME.md](../../../THEME.md)** at the repository root.

## Design philosophy

From [THEME.md](../../../THEME.md) — composable primitives, accessible forms, and dark-first cards with a **premium restrained luxury** palette. Cursor agents must follow [.cursorrules](../../../.cursorrules).

- **Precision engineering** and **high-end industrial tech**
- **Dark-first** — deep charcoals, machined metallic edges, no decorative noise
- **Deep teal** (`#0D7377`) primary CTA, **rich crimson** (`#922B3E`) secondary accent
- **Charcoal surfaces** (`#111`, `#1A1A1A`, `#2A2A2A`) with metallic borders
- **WCAG 2.1 AA** focus rings, 44px touch targets, keyboard navigation
- **Zero arbitrary hex** — all colors resolve to `--viking-*` tokens

## Features

- **4px grid** spacing (`--viking-space-half` … `--viking-space-10`; legacy `--viking-space-1` = 8px)
- **16px** main content / **14px** Drakkar shell typography with full type scale
- Zero-dependency components (`viking-*` selectors, `--viking-*` tokens)
- WCAG 2.1 AA focus rings, smooth theme transitions, axe-core tested templates

## Install

```bash
npm install @dataengineeringformachinelearning/viking-ui
```

Peer dependencies: `@angular/core` ^22, `@angular/common` ^22, `@angular/forms` ^22.

## Usage

```typescript
import {
  VikingButton,
  VikingField,
  VikingInput,
} from '@dataengineeringformachinelearning/viking-ui';
```

Load static CSS for non-Angular surfaces (marketing, Django templates):

```html
<link rel="stylesheet" href="/assets/design-tokens.css" />
<link rel="stylesheet" href="/assets/viking-ui.css" />
```

### Token files

| File | Purpose |
| ---- | ------- |
| `src/styles/_variables.scss` | Canonical SCSS — edit tokens here |
| `src/tokens/viking-tokens.json` | Machine-readable palette |
| `src/tokens/tailwind.preset.js` | Tailwind `theme.extend` → CSS vars |
| `src/tokens/series-presets.ts` | Series color constants for charts/pickers |

## Icons (Lucide)

`viking-icon` renders themeable inline SVGs with **zero runtime dependencies**. Lucide paths are synced at build time:

```bash
npm run sync:lucide-icons   # regenerate lucide-paths.generated.ts
```

```html
<viking-icon name="search" sizePreset="md" color="accent" />
<viking-icon name="drakkar" [size]="28" color="accent" />
```

- **size** / **sizePreset** (`sm` 16px · `md` 20px · `lg` 24px)
- **color** — semantic tokens (`accent`, `success`, `warning`, `danger`, `muted`) or any CSS value
- **variant** — `outline` (stroke) or `filled` (solid)
- **Drakkar brand marks** — `drakkar`, `drakkar-compact`, `drakkar-lockup` (custom longship geometry, site shell / Viking-UI)
- **DEML product marks** — `deml`, `deml-compact`, `deml-lockup` (optimized SVGs in `src/lib/core/brand-icons.ts`)

Also exported as `VikingIconComponent` for consumers expecting that name.

## Build

```bash
npm run build:viking-ui
npm run build:viking-ui-css
npm run start:viking-ui-docs   # from repo root — http://localhost:4300
```

## Version bump

Bump `package.json` in this directory before every publish (npm will not overwrite an existing version).

```bash
cd frontend/projects/viking-ui
npm version patch --no-git-tag-version   # or minor / major
```

| Bump  | When                                     |
| ----- | ---------------------------------------- |
| patch | Bug fixes, token/CSS tweaks, a11y fixes  |
| minor | New components, additive APIs            |
| major | Breaking input/output or removed exports |

## Publish

Requires membership in the npm org `dataengineeringformachinelearning` (scope `@dataengineeringformachinelearning`).

```bash
cd frontend
npm run test:viking-ui
npm run build:viking-ui
cd dist/viking-ui
npm publish --access public --otp=YOUR_CODE
```

## License

Apache License 2.0 — see [LICENSE](LICENSE) in this package (same terms as the root [Data Engineering for Machine Learning](https://github.com/dataengineeringformachinelearning/dataengineeringformachinelearning) repository).
