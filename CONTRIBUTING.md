# Contributing

This repository is the **community / marketing** surface for Data Engineering for Machine Learning:

- [BOOK.md](BOOK.md) and [WHITEPAPER.md](WHITEPAPER.md)
- Astro site under [marketing/](marketing/)

## Related repos

| Repo | What to change there |
|------|----------------------|
| [`deml`](https://github.com/dataengineeringformachinelearning/deml) | Control plane (Angular, Django BFF) |
| [`deml-ui`](https://github.com/dataengineeringformachinelearning/deml-ui) | Design system (warm ash NFTS — Storybook `ui.deml.app`) |
| [`forjd`](https://github.com/dataengineeringformachinelearning/forjd) | Data plane (FastAPI, Rust engine, sealed pipelines) |

## Marketing site

```bash
cd marketing
npm install
npm run dev
```

Sync BOOK/README into marketing content assets:

```bash
npm run sync:content
```

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.
