# Data Engineering for Machine Learning

Community site, BOOK, and public documentation for the DEML ecosystem.

| Repo | Role | Production |
|------|------|------------|
| **This repo** | Community / marketing + BOOK | Vercel `marketing` → [dataengineeringformachinelearning.com](https://dataengineeringformachinelearning.com) |
| [`deml`](https://github.com/dataengineeringformachinelearning/deml) | Control plane | [deml.app](https://deml.app) · [backend.deml.app](https://backend.deml.app) |
| [`forjd`](https://github.com/dataengineeringformachinelearning/forjd) | Data plane | Fly → [backend.forjd.co](https://backend.forjd.co) |
| [`deml-ui`](https://github.com/dataengineeringformachinelearning/deml-ui) | Design system | [ui.deml.app](https://ui.deml.app) |

## Content SoT

| Path | Purpose |
|------|---------|
| [BOOK.md](BOOK.md) | Platform architecture & operations narrative |
| [WHITEPAPER.md](WHITEPAPER.md) | Executive summary |
| [marketing/](marketing/) | Astro marketing site |
| [scripts/sync_content.py](scripts/sync_content.py) | Propagate BOOK/README into marketing assets |

Product UI lives in **deml**. Sealed streaming lives in **forjd**.

## Local marketing site

```bash
cd marketing
npm install
npm run dev
```

Sync BOOK/README into marketing content:

```bash
npm run sync:content
```

## Deploy

Vercel project `marketing`, root `marketing`. Details: [`docs/VERCEL.md`](docs/VERCEL.md).

```bash
cd marketing
npx vercel link --project marketing --yes
npx vercel deploy --prod --yes
```

Redirects: `/status/:slug` → deml.app. Developer docs live at `/documentation`.

## Related

- [CONTRIBUTING](CONTRIBUTING.md) · [SECURITY](SECURITY.md)

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fdataengineeringformachinelearning%2Fdataengineeringformachinelearning.svg?type=large&issueType=license)](https://app.fossa.com/projects/git%2Bgithub.com%2Fdataengineeringformachinelearning%2Fdataengineeringformachinelearning?ref=badge_large&issueType=license)
