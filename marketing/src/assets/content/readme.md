# Data Engineering for Machine Learning

Community site, BOOK, and public documentation for the DEML ecosystem.

> **Repo map**
>
> | Repo | Role | Production |
> |------|------|------------|
> | **This repo** | Community / marketing + BOOK | Vercel `marketing` → [dataengineeringformachinelearning.com](https://dataengineeringformachinelearning.com) |
> | [`deml`](https://github.com/dataengineeringformachinelearning/deml) | Control plane | Vercel `deml` → [deml.app](https://deml.app) · Fly `deml-backend` → [backend.deml.app](https://backend.deml.app) |
> | [`forjd`](https://github.com/dataengineeringformachinelearning/forjd) | Data plane | Vercel `forjd` → [forjd.co](https://forjd.co) · Fly API/engine |

## What's in this repo

| Path | Purpose |
|------|---------|
| [BOOK.md](BOOK.md) | Full platform architecture & operations narrative |
| [WHITEPAPER.md](WHITEPAPER.md) | Executive summary |
| [marketing/](marketing/) | Astro marketing site |
| [docs/](docs/) | Suite UI notes + [VERCEL.md](docs/VERCEL.md) deploy for this site |
| [scripts/sync_content.py](scripts/sync_content.py) | Propagate BOOK/README into marketing assets |

Product UI, Django BFF, and native apps live in **`deml`**. Design system is **[`deml-ui`](https://github.com/dataengineeringformachinelearning/deml-ui)** (warm ash NFTS). Sealed streaming lives in **`forjd`**.

## Deploy

| Setting | Value |
|---------|-------|
| Vercel project | `marketing` |
| GitHub repo | `dataengineeringformachinelearning/dataengineeringformachinelearning` |
| Root directory | `marketing` |
| Domain | `dataengineeringformachinelearning.com` |
| Install | `npm install --legacy-peer-deps --no-workspaces` |
| Design system | `deml-ui` (github pin / npm — no monorepo package build) |

```bash
cd marketing
npx vercel link --project marketing --yes
npx vercel deploy --prod --yes
```

Details: [`docs/VERCEL.md`](docs/VERCEL.md).

Marketing redirects product paths to the control plane (`/status/:slug` → `deml.app`, `/documentation` → `backend.deml.app`).

## Local marketing site

```bash
cd marketing
npm install
npm run dev
```

Sync BOOK/README into marketing content assets:

```bash
npm run sync:content
```

## Related

- Control plane: https://github.com/dataengineeringformachinelearning/deml
- Data plane: https://github.com/dataengineeringformachinelearning/forjd
- [CONTRIBUTING](CONTRIBUTING.md) · [SECURITY](SECURITY.md)

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fdataengineeringformachinelearning%2Fdataengineeringformachinelearning.svg?type=large&issueType=license)](https://app.fossa.com/projects/git%2Bgithub.com%2Fdataengineeringformachinelearning%2Fdataengineeringformachinelearning?ref=badge_large&issueType=license)

![GitHub Repo stars](https://img.shields.io/github/stars/dataengineeringformachinelearning/dataengineeringformachinelearning?style=social)
