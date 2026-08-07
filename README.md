# Data Engineering for Machine Learning

Community site, BOOK, blog, and public documentation for the DEML ecosystem.

| Repo | Role | Production |
|------|------|------------|
| [`deml`](https://github.com/dataengineeringformachinelearning/deml) | Control plane | [deml.app](https://deml.app) · [backend.deml.app](https://backend.deml.app) |
| [`deml-ui`](https://github.com/dataengineeringformachinelearning/deml-ui) | Design system (warm ash NFTS) | [ui.deml.app](https://ui.deml.app) |
| [`forjd`](https://github.com/dataengineeringformachinelearning/forjd) | Data plane | [backend.forjd.co](https://backend.forjd.co) |
| **This repo** | Community / marketing + BOOK | Vercel `marketing` → [dataengineeringformachinelearning.com](https://dataengineeringformachinelearning.com) |

## Owns

- Public marketing Astro site (warm ash via **deml-ui**)
- BOOK + whitepaper source markdown and published pages
- Blog / Blue Notes (`/blog` — canonical; `deml.app/blog` 301s here)
- Human documentation (`/documentation`), compliance, privacy, terms
- SEO assets: sitemap, robots, `llms.txt`, OG/Twitter meta

Product UI lives in **deml**. Sealed streaming lives in **forjd**. Design tokens live in **deml-ui**.

## Run

```bash
cd marketing
npm install
npm run dev
```

Sync BOOK/README into marketing content:

```bash
npm run sync:content
```

## Check

```bash
cd marketing
npm test
npm run build          # Astro build + sitemap + verify-build
```

## Deploy

| Host | Platform | Notes |
|------|----------|-------|
| `dataengineeringformachinelearning.com` | Vercel project `marketing`, root `marketing` | [`docs/VERCEL.md`](docs/VERCEL.md) |

```bash
cd marketing
npx vercel link --project marketing --yes
npx vercel deploy --prod --yes
```

Redirects: `/status/:slug` → deml.app. First-party here: `/`, `/book`, `/whitepaper`, `/documentation`, `/blog`, `/compliance`, `/privacy`, `/terms`.

Env (Production): `FRONTEND_URL=https://deml.app` · `BACKEND_URL=https://backend.deml.app` · `MARKETING_URL=https://dataengineeringformachinelearning.com`.

## Layout

```text
BOOK.md · WHITEPAPER.md     Architecture narrative + executive summary
marketing/                 Astro site (pages, blue-notes, SEO, vercel.json)
marketing/src/content/     Blue Notes SoT for /blog
scripts/sync_content.py    Propagate BOOK/README + llms.txt into marketing
docs/VERCEL.md             Deploy + redirect contract
```

## Docs

| Doc | When |
|-----|------|
| [BOOK.md](BOOK.md) | Platform architecture & operations narrative |
| [WHITEPAPER.md](WHITEPAPER.md) | Executive summary |
| [`docs/VERCEL.md`](docs/VERCEL.md) | Deploy + redirects |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) · [`SECURITY.md`](SECURITY.md) | Contribute / vulns |
| deml [`THEME.md`](https://github.com/dataengineeringformachinelearning/deml/blob/main/THEME.md) | Visual contract (deml-ui) |

## Related

- Product: [deml.app](https://deml.app)
- Blog: [dataengineeringformachinelearning.com/blog](https://dataengineeringformachinelearning.com/blog)
- Docs: [dataengineeringformachinelearning.com/documentation](https://dataengineeringformachinelearning.com/documentation)

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fdataengineeringformachinelearning%2Fdataengineeringformachinelearning.svg?type=large&issueType=license)](https://app.fossa.com/projects/git%2Bgithub.com%2Fdataengineeringformachinelearning%2Fdataengineeringformachinelearning?ref=badge_large&issueType=license)
