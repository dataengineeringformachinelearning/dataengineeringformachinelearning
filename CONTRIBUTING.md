# Contributing to Viking-UI

Thank you for helping make Viking-UI easier to adopt and extend. Viking-UI is the open-source design system for [Data Engineering for Machine Learning (DEML)](https://dataengineeringformachinelearning.com) — Apache-2.0, framework-agnostic, and token-driven.

**Live docs:** [ui.dataengineeringformachinelearning.com](https://ui.dataengineeringformachinelearning.com)

---

## Where to contribute

| Area                   | Path                                            | When to edit                          |
| ---------------------- | ----------------------------------------------- | ------------------------------------- |
| **Angular components** | `frontend/projects/viking-ui/src/lib/`          | New or updated UI primitives          |
| **Web Components**     | `frontend/projects/viking-ui/src/web/`          | Framework-agnostic custom elements    |
| **Design tokens**      | `packages/viking-ui/src/styles/_variables.scss` | Colors, spacing, typography, motion   |
| **Static CSS build**   | `packages/viking-ui/scripts/build-css.mjs`      | CSS bundle pipeline changes           |
| **Showcase / docs**    | `viking-ui-docs/src/`                           | Demos, guides, playground             |
| **Governance docs**    | `THEME.md`, `BOOK.md` Ch.31                     | Architectural or token policy changes |

New shared UI **always** belongs in `frontend/projects/viking-ui/` first. Do not fork one-off styles in app pages, marketing, or backend templates.

---

## Development setup

### Prerequisites

- **Node.js** ≥ 22.12
- **npm** (use `--legacy-peer-deps` in this monorepo)
- **Python 3.12+** with [uv](https://docs.astral.sh/uv/) for pre-commit hooks

### Clone and run locally

```bash
git clone https://github.com/dataengineeringformachinelearning/deml.git
cd deml

# Frontend + library
cd frontend && npm ci --legacy-peer-deps
npm run build:viking-ui

# Docs showcase (port 4300)
cd ../viking-ui-docs && npm ci --legacy-peer-deps
npm run dev
```

From repo root you can also run:

```bash
npm run start:viking-ui-docs
```

---

## Contribution workflow

1. **Fork** the repository and create a branch: `cursor/your-feature-160c` or `feature/your-feature`.
2. **Read** [THEME.md](THEME.md) and [.cursorrules](.cursorrules) before editing styles or components.
3. **Implement** in the library first; add showcase demos in `viking-ui-docs/src/lib/component-registry.ts`.
4. **Run quality gates** (see below).
5. **Open a pull request** with a clear description, screenshots for UI changes, and linked issues if applicable.

---

## Quality gates

Run these before submitting a PR:

```bash
uvx pre-commit install --install-hooks --hook-type pre-commit

# Theme and accessibility are enforced locally in pre-commit
uvx pre-commit run --all-files

# Theme token enforcement (no hardcoded hex)
node scripts/enforce-theme.js

# Package-level unit tests (build + test)
npm run test:viking-ui:package

# Visual + accessibility checks (Storybook + axe)
npm run build-storybook --workspace @dataengineeringformachinelearning/viking-ui
node scripts/run_axe.js packages/viking-ui/storybook-static/index.html

# Security checks
npm audit --audit-level=high
```

CI applies the same gates automatically on every Viking-UI PR via:

- theme enforcement (`node scripts/enforce-theme.js`)
- accessibility (`node scripts/run_axe.js` against Storybook build output)
- unit tests (`npm run test:viking-ui:package`)
- visual regression (Chromatic in PR workflow)
- security (`npm audit`, dependency-review)

### Token changes

When you edit `_variables.scss`:

```bash
npm run build:viking-ui:package
python scripts/sync_design_system.py
```

Update **THEME.md** and **BOOK.md** Chapter 31 together when governance or architecture changes.

---

## Adding a new component

Follow the universal architecture (see [Architecture guide](https://ui.dataengineeringformachinelearning.com/architecture)):

### 1. CSS primitives (all surfaces)

Add token-only styles in `src/styles/` — e.g. `_buttons.scss`, `_forms.scss`, or `components/`. Use `--viking-*` variables only.

### 2. Web Component (optional, recommended for static surfaces)

```text
src/web/my-component/viking-my-component-wc.ts
```

- Extend `HTMLElement` with Shadow DOM
- Inject styles via `attachShadowStyles()` from `src/web/core/`
- Register in `src/web/index.ts` → `registerVikingElements()`
- Tag naming: `viking-{name}-wc`

### 3. Angular wrapper

```text
src/lib/my-component/my-component.ts
```

- Standalone component, `ChangeDetectionStrategy.OnPush`
- Use signal `input()` / `output()` — not `@Input` / `@Output`
- Constructor parameter injection only in library code (no field-level `inject()`)
- Compose through `viking-field` for form controls
- Export from `src/public-api.ts`

### 4. Manifest and docs

- Add entry to `viking.manifest.json`
- Add showcase entry in `viking-ui-docs/src/lib/component-registry.ts` with:
  - Live preview HTML
  - Snippets for Angular, Astro, Django, and Web Components
  - API reference (`inputs`, `outputs`, `attributes`)

### 5. Tests

Add Vitest coverage for non-trivial behavior:

```bash
npm run test:viking-ui:package
```

Required for charts, forms, icons, and auth surfaces per project policy.

---

## Coding standards

### Styling

- **Tokens only** — `--viking-bg`, `--viking-accent`, `--viking-space-*`, etc.
- **Never** hardcode hex/rgb/hsl in components or templates (except `_variables.scss`)
- **Dark-first** — preserve `data-theme="dark"` default; light mode shifts lightness only
- **Focus** — visible `:focus-visible` with `--viking-ring`; never remove for aesthetics
- **Touch targets** — minimum 44px on mobile (`--viking-control-height`)

### Components

- Use existing `viking-*` primitives — no Material, Bootstrap, PrimeNG, or other UI kits
- **Status** — never color alone; pair tone with icon, label, or pattern
- **Charts** — native SVG via `viking-chart` only
- **Icons** — `viking-icon` registry only

### TypeScript / Angular

- Prefer `const` over `let`; arrow functions over `function`
- Async/await with try/catch
- Signal inputs: `readonly foo = input<string>('default')`
- Signal outputs: `readonly changed = output<void>()`

### Python (if touching backend)

- Type annotations on all function signatures
- Ruff formatting enforced via pre-commit

---

## Pull request checklist

- [ ] Changes live in `frontend/projects/viking-ui/` for shared UI
- [ ] Showcase updated in `viking-ui-docs/` if user-facing
- [ ] `uvx pre-commit run --all-files` passes
- [ ] `node scripts/enforce-theme.js` passes
- [ ] `npm run test:viking-ui:package` passes for touched surfaces
- [ ] `npm run build-storybook --workspace @dataengineeringformachinelearning/viking-ui` passes
- [ ] `node scripts/run_axe.js packages/viking-ui/storybook-static/index.html` passes
- [ ] `npm audit --audit-level=high` passes
- [ ] Token changes synced via `npm run build:viking-ui:package` + `python scripts/sync_design_system.py`
- [ ] THEME.md / BOOK.md updated if governance changed
- [ ] WCAG 2.1 AA: keyboard nav, focus rings, semantic HTML, aria labels

---

## Reporting issues

- **Bugs:** Include browser, framework (Angular/Astro/Django), reproduction steps, and screenshots
- **Feature requests:** Describe the use case and which consumption mode (CSS / WC / Angular)
- **Security:** Do not open public issues for vulnerabilities — contact the maintainers privately

---

## License

By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](frontend/projects/viking-ui/LICENSE).

---

## Resources

- [Viking-UI showcase](https://ui.dataengineeringformachinelearning.com)
- [THEME.md](THEME.md) — token matrix
- [BOOK.md Chapter 31](BOOK.md#chapter-31-viking-ui--the-zero-dependency-ui-kit) — architecture narrative
- [AGENTS.md](AGENTS.md) — platform invariants
