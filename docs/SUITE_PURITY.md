# Suite purity — Pass 6 checklist

**Gate:** `npm run suite:purity`
**Law:** [SUITE_UI_UNIFICATION.md](./SUITE_UI_UNIFICATION.md)

## Zero external style packages (verified)

| Library                                        | Runtime deps for look          |
| ---------------------------------------------- | ------------------------------ |
| `@dataengineeringformachinelearning/viking-ui` | **none** (`dependencies: {}`)  |
| `forjd-ui`                                     | **tslib only** + Angular peers |

No Material, Bootstrap, Tailwind, Spartan, Blueprint, shadcn, PrimeNG, etc.

## What the gate enforces

| Check                                           | Pass                 |
| ----------------------------------------------- | -------------------- |
| Role A token lock                               | `suite:tokens`       |
| Component chrome contracts                      | `suite:components`   |
| Landing stage                                   | `suite:landing`      |
| Backend twin                                    | `suite:backend`      |
| Storybook docs chrome                           | `suite:docs`         |
| No `#00b4ff` / Google Fonts CDN                 | purity scan          |
| No external UI style packages                   | package.json scan    |
| Suite CSS SHA lockstep DEML ↔ FORJD             | when sibling present |
| No page-owned SCSS under deml pages / forjd app | purity scan          |
| FORJD landing loads suite-fonts + suite-backend | purity scan          |
| Widget shadow tokens = void Role A              | purity scan          |

## Seven surfaces — identity map

| Surface                               | Style entry                                 | Identity                          |
| ------------------------------------- | ------------------------------------------- | --------------------------------- |
| forjd.co                              | suite-fonts → tokens → components → landing | Product landing DNA               |
| deml.app                              | `viking-app.css` (suite folded in)          | Same DNA                          |
| dataengineeringformachinelearning.com | `viking-ui.css`                             | Same DNA                          |
| backend.forjd.co                      | suite-fonts → tokens → components → backend | Quiet twin, centered logo         |
| backend.deml.app                      | `viking-ui.css`                             | Quiet twin, centered logo         |
| ui.forjd.co                           | suite + suite-docs                          | Story frame + manager suite theme |
| ui.deml.app                           | suite + suite-docs + viking-ui depth        | Same frame; Product/\* depth only |

## Mobile / performance (by construction)

| Trait              | Mechanism                                               |
| ------------------ | ------------------------------------------------------- |
| Touch ≥ 44px       | `--suite-touch` on controls                             |
| Dense desktop 40px | `--suite-control-height` ≥768px                         |
| Fast atmosphere    | CSS-only radials + grid (no JS animation libs on stage) |
| Fonts              | Self-hosted Inter (`font-display: swap`)                |
| No layout thrash   | Composition-only apps; chrome in suite CSS              |

## Remaining differences (intentional)

| Difference                                  | Why OK                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| Product names / logos                       | Brand marks may differ; chrome must not                                |
| DEML `Product/*` Storybook stories          | Status cards, suite header, charts — product depth                     |
| FORJD `Product/Panel` + `StatusList`        | Adapter demos on same suite classes                                    |
| Light `theme-color` on deml.app / marketing | Products that support light mode; dark default remains `#0a0a0a`       |
| Integration brand icon hexes (K8s, TF, …)   | Third-party logo colors, not product chrome                            |
| Google logo multicolor in icon registry     | Vendor mark fidelity                                                   |
| Swagger/ReDoc CDN **behavior** assets       | Until self-host Pass (docs shell is suite); overrides use suite tokens |
| Leaflet map CSS                             | Scoped under map surfaces; not product chrome                          |
| Algolia Experiences (if enabled)            | Third-party search chrome; Phase B data-only later                     |
| **Deploy lag**                              | Live hosts may lag git until Vercel/Fly deploy                         |

## Deploy debt (fix with next release)

| Host             | Live gap (as of Pass 6 audit)                     | Fix                                                   |
| ---------------- | ------------------------------------------------- | ----------------------------------------------------- |
| backend.forjd.co | Still served **inline cyan** splash in production | Deploy FORJD backend with suite-fonts + suite-backend |
| backend.deml.app | `theme-color` may still be `#111111`              | Deploy DEML backend with suite `theme-color: #0a0a0a` |

## How to re-verify

```bash
# Contracts
npm run suite:tokens
npm run suite:components
npm run suite:landing
npm run suite:backend
npm run suite:docs
npm run suite:purity

# FORJD vendor
cd ../forjd/frontend && npm run sync:suite

# Smoke public shells (after deploy)
curl -sS https://backend.forjd.co/ | grep -E 'suite-backend|00b4ff'
curl -sS https://forjd.co/ | grep -E 'theme-color|2176ff'
```

## Pass 6 result

Source purity is **green**. Visual identity is unified in source for all seven surfaces. Production backend.forjd.co must be redeployed to clear residual cyan splash.
