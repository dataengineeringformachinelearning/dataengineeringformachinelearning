# @dataengineeringformachinelearning/viking-ui

**Viking-UI** is DEML's clinical Angular design system — lab-coat aesthetics on THEME.md tokens.

- **8px grid** spacing (`--space-1` … `--space-8`)
- **16px** main content / **14px** UI chrome typography
- **Crayola blue** (`#2176ff`) primary, **blue-bell** (`#33a1fd`) accents
- Zero-dependency components (`viking-*` selectors, `--viking-*` tokens)
- WCAG 2.1 AA focus rings, axe-core tested templates

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

## Build

```bash
npm run build:viking-ui
npm run build:viking-ui-css
npm run serve:viking-ui-showcase
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
