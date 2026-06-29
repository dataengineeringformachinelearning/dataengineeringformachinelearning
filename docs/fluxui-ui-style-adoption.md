# FluxUI Adoption Analysis & Tailwind-to-SASS Conversion Schema

**Status**: Investigation / Feasibility  
**Date**: 2026-06-29  
**Context**: User request to evaluate pivoting the platform UI to https://fluxui.dev/ visuals while remaining on Angular + Angular Material 3 and **exclusively** using colors/tokens from `THEME.md`.

> **AGENTS.md Rule**: Before creating/editing ANY HTML/CSS/SCSS, THEME.md was read (see tool history). All work adheres to 9px grid, 18px font floor, WCAG 2.1 AA, zero new hard-coded colors, symmetrical design, and automation.

---

## 1. Executive Summary

**Direct adoption of the FluxUI library: Impossible.**

- FluxUI is a **Livewire (Laravel/PHP) + Tailwind CSS v4** component library.
- It ships Blade components (`<flux:button>`, `<flux:input>`, etc.) + a compiled `flux.css` that depends on Tailwind.
- No Angular components, no framework-agnostic web components, no plain CSS distribution suitable for Angular SSR + Material.

**Visual / aesthetic pivot ("look like Flux"): Feasible with constraints.**

We can emulate Flux's clean, accessible, composable, dark-mode-first aesthetic **inside** our existing design system by:
- Using the **exact same THEME.md** color tokens (never Flux's zinc/red/etc. palettes).
- Mapping Flux's Tailwind utilities and component patterns into our SCSS tokens + custom components.
- Enhancing Angular Material overrides and/or custom components (unified-select, buttons, fields) to feel more like Flux's outline/primary/filled/ghost/subtle variants, grouped controls, icon+input compositions, and subtle surfaces.
- Keeping full compatibility with Angular Material 3 theming (`mat.theme(use-system-variables: true)`).

**Tailwind → SASS conversion "schema": Yes, as a reference mapping (not a runtime transpiler).**

We define a documented, deterministic mapping from common Tailwind classes and Flux patterns to DEML SCSS/CSS custom properties. This helps maintain consistency when porting inspiration or reviewing designs.

**Recommendation**: 
- **Do not** "update all components" in a big bang.
- Perform an **incremental "Flux-inspired refresh"** on high-visibility form and navigation components.
- Enforce via existing automation (pre-commit, `scripts/run_axe.js`, ruff/prettier/eslint on related, visual regression if added later).
- Pilot on 2-3 components, measure a11y + layout shift.

---

## 2. FluxUI Visual Language (Observed)

From official site and docs (buttons, inputs, groups, dropdowns, selects):

- **Font**: Inter (we already use).
- **Base sizes**: Compact but readable; sm/xs variants.
- **Variants** (button): outline (default), primary, filled, danger, ghost, subtle.
- **Colors**: Any Tailwind color for primary variant (we will **restrict** to our 5 brand colors + semantic aliases only).
- **Form fields**: `<flux:field>` wrapper with label + description + control + error. Clean outline or filled. Icon leading/trailing, groups with prefix/suffix, kbd hints, clearable/copyable.
- **Grouping**: `button.group`, `input.group` for fused borders.
- **Surfaces**: Subtle borders, minimal shadows, excellent dark mode.
- **Accessibility**: Keyboard, ARIA, screenreader tested.
- **Composition**: Lots of small building-block elements mixed in templates.
- **Spacing**: Tailwind scale (0.25rem increments); we will map to our stricter 9px grid where possible.

Flux ships a lot of the look via Tailwind utilities on top of its base flux.css.

---

## 3. Current DEML Design System Strengths (vs Flux needs)

- Single source `THEME.md` + `frontend/src/design-system/tokens.scss` + `material-tokens.scss` + shared `packages/deml-design-system`.
- 9px grid (`--space-1` ... `--space-8`, `--grid-unit`).
- 18px minimum font size everywhere (enforced via `max(18px, ...)`).
- Light/dark via `html[data-theme]` + prefers-color-scheme.
- Heavy Angular Material 3 customization already (buttons are pill or sm radius, cards, dialogs, selects).
- Custom `unified-select` (good candidate for Flux-like polish).
- Mobile-first, `.page-inner-wrapper { max-width: 1260px }`.
- Utilities in SCSS (`.u-*`).
- Shared CSS build for marketing (Astro) + frontend.

Gaps to close for Flux "feel":
- More explicit "outline / subtle / ghost" treatments.
- Better field grouping (prefix/suffix, adjacent buttons).
- Consistent subtle surfaces and focus states.
- Slightly tighter control heights in places (while respecting 18px + 9px).
- Composability patterns documented for Angular templates (directives or structural components).

---

## 4. Tailwind → DEML SASS Conversion Schema

This is a **reference schema**, not executed by a build step. Use it when:
- Reviewing external designs that use Tailwind.
- Writing new SCSS that should "feel" like a Flux component.
- Documenting "inspired" changes.

### 4.1 Color Mapping (Strict THEME.md Only)

Flux allows arbitrary `color="blue"` etc. on primary buttons.

**DEML rule**: Map every color intent to one of:

| Semantic Alias (THEME) | Dark Value          | Light Value         | Flux-like Usage Example                  |
|------------------------|---------------------|---------------------|------------------------------------------|
| `--color-primary`      | `--crayola-blue`    | `--crayola-blue`    | Primary / main CTAs                      |
| `--color-primary-container` | `--blue-bell`   | `--blue-bell`       | Accent / secondary filled                |
| `--color-error`        | `--carrot-orange`   | `--carrot-orange`   | Danger                                   |
| `--color-warning`      | `--golden-pollen`   | `--golden-pollen`   | Warning / subtle emphasis                |
| `--color-success`      | `--blue-bell`       | `--blue-bell`       | Success                                  |
| `--text-color` / on-*  | white / jet-black   | jet-black / white   | Text on surfaces                         |
| `--card-bg` / `--color-surface` | jet-black / white | white / jet-black | Panels, cards, dropdowns              |

**Never** introduce zinc, rose, emerald, etc.

CSS var usage in SCSS:
```scss
background-color: var(--color-primary);
color: var(--color-on-primary);
border-color: var(--border);
```

### 4.2 Spacing / Sizing Mapping (9px Grid + 18px Floor)

Tailwind uses 0.25rem (4px) scale. We use 9px units.

| Tailwind (examples) | Approx px | DEML Token / Rule                          | Notes |
|---------------------|-----------|--------------------------------------------|-------|
| `p-1` / `p-2`       | 4 / 8     | `padding: var(--space-1);` (9px)           | Use `--space-1` min for touch targets |
| `p-3`               | 12        | `padding: var(--space-1);` or 8px local    | Prefer token; small drift ok in inputs |
| `p-4`               | 16        | `padding: var(--space-2);` (18px)          | Standard |
| `gap-2` / `gap-3`   | 8 / 12    | `gap: var(--space-1);` or `--space-2`      | |
| `m-4`               | 16        | `margin: var(--space-2);`                  | |
| `rounded` / `rounded-md` | ~6px | `border-radius: var(--border-radius-md);` | 9px |
| `rounded-lg`        | 8px       | `var(--border-radius-lg);` (18px)          | Cards, dropdowns |
| `rounded-full`      | pill      | `var(--border-radius-pill);` or 96px for pills | Buttons use 96px for primary in some places per current styles |
| `text-xs` / `text-sm` | <18px   | `font-size: max(18px, 0.875rem);` or token | Enforce floor |
| `h-9` / `h-10`      | 36/40     | `min-height: 40px;` or calc with space     | Inputs ~40-56px for a11y |

**Rule**: After mapping, run through 9px lens. If a Flux example uses 12px padding, choose closest 9/18px that preserves touch targets (min 44px recommended).

### 4.3 Typography & Effects

| Tailwind                  | DEML |
|---------------------------|------|
| `font-sans`               | `'Inter', sans-serif` (already) |
| `tracking-tight`          | `letter-spacing: var(--header-letter-spacing);` (-0.02em) |
| `shadow-sm`               | `var(--shadow-sm)` |
| `shadow-md` / `shadow`    | `var(--shadow-md)` |
| `transition`              | `var(--transition-smooth)` |
| `dark:` variants          | `html[data-theme='dark'] & { ... }` or `:host-context` in components |

### 4.4 Component Pattern Mapping (Flux → DEML Angular)

**Button**

Flux:
```blade
<flux:button variant="primary">Save</flux:button>
<flux:button variant="ghost" icon="x-mark" />
<flux:button.group>...</flux:button.group>
```

DEML (Material + classes):
- Use `<button mat-raised-button color="primary">` or custom `.btn` with our tokens.
- Add supporting classes: `.flux-btn-subtle`, `.flux-btn-ghost` (defined in overrides).
- For groups: wrap in a container with `.flux-button-group` that applies adjacent border logic via CSS.

**Input / Field**

Flux uses a `flux:field` + label/desc + control.

In Angular:
- Continue `mat-form-field` or custom `.flux-field` wrapper.
- Add `.flux-input-group`, `.flux-input-prefix`, `.flux-input-suffix`.
- Support projected icon buttons inside (slots via ng-content).

**Select / Dropdown**

- Our `unified-select` is already close to Flux select.
- Make its trigger/dropdown padding, focus, and selected state match Flux "outline" cleanliness.

**Groups & Composition**

Provide:
```html
<div class="flux-input-group">
  <span class="flux-input-prefix">https://</span>
  <input ... />
  <button class="flux-input-affix-btn">...</button>
</div>
```

### 4.5 Formal JSON Schema (for tooling / linters / docs)

```json
{
  "name": "deml-flux-tailwind-to-sass-mapping",
  "version": "1.0.0",
  "rules": {
    "colors": {
      "allowed": ["--crayola-blue", "--blue-bell", "--golden-pollen", "--carrot-orange", "--jet-black", "--white", "--black", "semantic aliases"],
      "disallowed": "any other hex / Tailwind color name"
    },
    "spacing": {
      "grid": "9px",
      "tokens": ["--space-1", "--space-2", "--space-3", "--space-4", "--space-5", "--space-6", "--space-7", "--space-8"],
      "mapping": {
        "p-1": "--space-1",
        "p-2": "--space-1",
        "p-4": "--space-2"
      }
    },
    "typography": {
      "minFontSize": "18px",
      "family": "Inter"
    },
    "borderRadius": {
      "sm": "--border-radius-sm",
      "md": "--border-radius-md",
      "lg": "--border-radius-lg",
      "pill": "--border-radius-pill | 96px for primary CTAs"
    }
  },
  "componentMappings": {
    "button": {
      "variants": ["primary", "filled", "danger", "ghost", "subtle", "outline"],
      "implementAs": "Angular Material overrides + .flux-btn-* utility classes"
    },
    "input": {
      "wrappers": ["flux-field", "flux-input-group"],
      "implementAs": "mat-form-field + custom group SCSS or standalone web-native input"
    }
  }
}
```

Store this schema in the doc and optionally as `frontend/src/design-system/flux-mapping.schema.json` for future validation scripts.

---

## 5. Angular / Material 3 Integration Strategy

1. **Keep** `mat.theme( use-system-variables: true )`.
2. **Continue** overriding via `material-tokens.scss` + `components/material-overrides.scss`.
3. **Add** (opt-in) Flux-inspired layer:
   - New partial: `components/flux-inspired.scss` (forwarded from index).
   - Classes: `.flux-btn`, `.flux-btn-primary`, `.flux-btn-subtle`, `.flux-field`, `.flux-input-group`, etc.
   - These use only THEME vars and 9px tokens.
4. For complex Flux-like components (command palette, rich editor, calendar) — implement as **custom Angular components** or use existing libs wrapped, never by trying to port Tailwind classes.
5. Update `unified-select`, login form controls, navbar actions, etc. incrementally.
6. Marketing (Astro) benefits automatically via the shared `packages/deml-design-system` build.

**Do not**:
- Add Tailwind to `frontend/` or `marketing/`.
- Hardcode new colors.
- Use sequential px values outside the 9px system without strong justification (document in comments).

---

## 6. Risks & Mitigations (AGENTS.md Alignment)

- **Big-bang "update all"**: High risk of regression, CLS, a11y breaks. → **Mitigation**: Pilot, axe runs, incremental PRs.
- **Material DOM structure**: Overrides can break on Angular/Material upgrades. → **Mitigation**: Pin versions, add contract tests if visual.
- **Spacing drift**: Tailwind 4px vs 9px. → Use tokens; accept small local exceptions only with comments.
- **Composability**: Angular templates are less "play with blocks" than Blade. → Provide well-documented small components + examples.
- **IP / zero-dep**: We already own our tokens. Emulation keeps us sovereign.
- **Performance**: Extra SCSS is tree-shaken at build; keep small.

---

## 7. Proposed POC & Rollout

**Phase 0 (this doc + schema)**: Complete.

**Phase 1 (pilot)**:
- Refresh `unified-select` visuals to Flux-like (clean trigger, better option hover, subtle borders, icon alignment).
- Add `.flux-button-group` support.
- Introduce 1-2 new Flux-inspired button treatments in global styles using THEME only.
- Run `node scripts/run_axe.js` and full frontend lint/build.

**Phase 2**:
- Field grouping primitives.
- Update 3-5 high-traffic pages (login, settings, analytics filters).
- Sync tokens to `packages/deml-design-system`.

**Phase 3** (only if value proven):
- Systematic pass across remaining components.
- Consider visual snapshot tests.

---

## 8. References

- `THEME.md` (root) — canonical colors, grid, typography rules.
- `frontend/src/design-system/` (tokens, material-tokens, components/*).
- `packages/deml-design-system/` — shared build.
- `frontend/src/styles.scss`, `theme.scss`.
- Flux docs: https://fluxui.dev/ (buttons, inputs, theming, dark mode).
- AGENTS.md — "Critical Code Styling & Theming Law", no hardcoded palettes, WCAG automation.

---

## 9. Acceptance Criteria for Any Follow-up Work

- [ ] All new/edited colors come from THEME.md tokens only.
- [ ] Spacing uses `--space-*` or documented 9px multiples.
- [ ] 18px font floor preserved.
- [ ] `node scripts/run_axe.js` passes with no new violations.
- [ ] `npm run lint` (frontend) and `uvx pre-commit run --all-files` (root) clean.
- [ ] Changes work in both light and dark via `data-theme`.
- [ ] No Tailwind added to Angular or Astro stacks.
- [ ] Docs updated (this file or BOOK.md if architectural).

---

*This document is the living record. Update it before large style refactors.*
