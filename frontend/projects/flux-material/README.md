# @deml/flux-material

Flux-Material is the DEML UI kit: the free component styles of
[Flux UI](https://fluxui.dev) re-implemented as **zero-dependency Angular
standalone components**, themed with the DEML Material design tokens
(`THEME.md` palette only — no colors outside the design matrix).

All 46 free Flux components are covered — see `flux.manifest.json` for the
full component-to-upstream mapping.

## Usage inside this repo

The app consumes the library **directly from source** via the TypeScript path
mapping `@deml/flux-material` (see `tsconfig.json`), so no build step is needed
during development:

```ts
import { FluxButton, FluxCard, FluxToastService } from '@deml/flux-material';

@Component({
  imports: [FluxButton, FluxCard],
  template: `
    <flux-card>
      <flux-button variant="primary" icon="check" (pressed)="save()">Save</flux-button>
    </flux-card>
  `,
})
export class Example {}
```

Design tokens are provided by `src/styles/flux-material.scss`, which layers
`--flux-*` custom properties on top of the canonical DEML tokens. It is
imported once in `src/styles.scss`. Standalone consumers get sensible
THEME.md fallbacks even without the app tokens.

Toasts need a single outlet near the app root:

```html
<flux-toaster />
```

```ts
inject(FluxToastService).show({ heading: 'Saved', text: 'All good.', tone: 'success' });
```

A live component gallery ships as a **separate Angular app** (not on deml.app):

```bash
npm run serve:flux-material-showcase   # dev gallery
npm run build:flux-material-system     # library + gallery bundle
```

See `projects/flux-material-showcase/README.md`.

## Building an npm package

The library builds with ng-packagr into a publishable Angular Package Format
bundle:

```bash
npm run build:flux-material   # outputs dist/flux-material
cd dist/flux-material && npm publish   # if/when we want to distribute it
```

## Staying in sync with upstream Flux

Flux UI is a Livewire/Blade + Tailwind library, so we track it at the _style
and API_ level rather than vendoring code:

- `flux.manifest.json` records every upstream component URL we mirror and the
  Angular exports that implement it.
- `npm run check:flux-upstream` fetches the live fluxui.dev component index
  and diffs it against the manifest — new upstream components (or renames)
  fail the check so we notice immediately.
- When upstream adds a component: implement it under `src/lib/<name>/`,
  export it from `src/public-api.ts`, and add a manifest entry.

## Conventions

- Selector prefix `flux-` (`flux-button`, `flux-modal`, directive `fluxTooltip`).
- Signal-based inputs/outputs/models, `ChangeDetectionStrategy.OnPush`.
- Form controls implement `ControlValueAccessor` (work with ngModel and
  reactive forms).
- WCAG 2.1 AA: 18px font floor, visible `:focus-visible` rings, semantic
  roles/aria attributes, keyboard operability.
- 9px spacing grid; colors only via `--flux-*` tokens which resolve to
  THEME.md semantic tokens.
