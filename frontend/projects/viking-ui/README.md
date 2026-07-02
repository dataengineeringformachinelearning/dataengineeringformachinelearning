# @deml/viking-ui

**Viking-UI** is DEML's clinical Angular design system — lab-coat aesthetics on THEME.md tokens.

- **8px grid** spacing (`--space-1` … `--space-8`)
- **16px** main content / **14px** UI chrome typography
- **Crayola blue** (`#2176ff`) primary, **blue-bell** (`#33a1fd`) accents
- Zero-dependency components (`viking-*` selectors, `--viking-*` tokens)
- WCAG 2.1 AA focus rings, axe-core tested templates

Inspired by [Flux UI](https://fluxui.dev) composability and [Spartan](https://spartan.ng) headless patterns — implemented natively for Angular without Radix/CDK UI deps.

## Install

```bash
npm install @deml/viking-ui
```

Peer dependencies: `@angular/core` ^22, `@angular/common` ^22, `@angular/forms` ^22.

## Usage

```typescript
import { VikingButton, VikingField, VikingInput } from '@deml/viking-ui';
```

Load static CSS for non-Angular surfaces (marketing, Django templates):

```html
<link rel="stylesheet" href="/assets/design-tokens.css" />
<link rel="stylesheet" href="/assets/viking-ui.css" />
```

## Build

```bash
npm run build:viking-ui
npm run build:viking-ui-css
npm run serve:viking-ui-showcase
```

## Publish

```bash
cd frontend && npm run build:viking-ui
cd dist/viking-ui && npm publish --access public
```
