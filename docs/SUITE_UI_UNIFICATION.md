# Suite UI Unification Mandate

**Status:** Superseded for product chrome — **deml-ui** is the visual source of truth.
**Effective cutover:** 2026-08-04
**Canonical visual SoT:** published npm package [`deml-ui`](https://www.npmjs.com/package/deml-ui) (`^1.2.0`+) — warm ash **new-from-the-start (NFTS)**. Upstream repo: [`deml-ui`](https://github.com/dataengineeringformachinelearning/deml-ui).

> Control-plane copy: [`deml/docs/SUITE_UI_UNIFICATION.md`](https://github.com/dataengineeringformachinelearning/deml/blob/main/docs/SUITE_UI_UNIFICATION.md) / [`deml/THEME.md`](https://github.com/dataengineeringformachinelearning/deml/blob/main/THEME.md).
> Storybook: [ui.deml.app](https://ui.deml.app).

## Law

1. **deml-ui owns look.** Tokens, HTML/CSS components, Web Components, and Angular markup live in the deml-ui package. Expand visuals there only.
2. **Warm ash NFTS only.** Grounds `#35312D` / `#1C1916`, cream modules `#F3F0EA`, light ground `#D4CEC5`, primary `#2F5F8F`, accents `#3F6B54` / `#9E3D47`. **Geist only** for type.
3. **No Viking-UI.** Do not use `@dataengineeringformachinelearning/viking-ui`, `viking-*` / `--viking-*`, void-black / electric `#2176ff` suite chrome, or Inter suite-font stacks for product UI.
4. **Apps compose, they do not invent.** Marketing (Astro), DEML Angular, Django static, and FORJD backend HTML shells consume deml-ui class contracts.

## Surfaces

| Host                                                                                   | Repo surface                   | Chrome owner                                      |
| -------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------- |
| [backend.forjd.co](https://backend.forjd.co)                                           | FastAPI `/`, `/docs`, `/redoc` | vendored deml-ui (`npm run sync:deml-ui`)         |
| [deml.app](https://deml.app)                                                           | Angular product                | `deml-ui` npm                                       |
| [backend.deml.app](https://backend.deml.app)                                           | Django + API docs              | synced deml-ui CSS                                  |
| [dataengineeringformachinelearning.com](https://dataengineeringformachinelearning.com) | Astro marketing                | `deml-ui` + `@fontsource-variable/geist`            |
| [ui.deml.app](https://ui.deml.app)                                                     | Storybook                      | deml-ui                                             |

FORJD product landing at forjd.co is retired; partners use `https://backend.forjd.co`.

## Marketing cutover notes

- Layout imports `deml-ui/styles.css` and Geist variable fonts.
- Compose with deml-ui contracts: `banner`, `page-section`, `section-header`, `card-grid` / `card`, `site-navbar`, `site-footer`, `button`, `badge`, `theme-toggle`.
- Theme colors: `#35312D` (dark) / `#D4CEC5` (light).
- FORJD links point to `https://backend.forjd.co`. DEML links use `FRONTEND_URL` (`https://deml.app`).

## Historical note

Earlier suite passes (viking-ui / suite-tokens / electric void) are retired. Do not revive them for new work. For operational product docs, prefer deml `THEME.md`, deml-ui `AGENTS.md`, and FORJD `docs/SUITE_UI_UNIFICATION.md`.
