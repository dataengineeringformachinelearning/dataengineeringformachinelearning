# Railway (optional standby)

Primary production hosts:

| Surface          | Host                     |
| ---------------- | ------------------------ |
| Angular          | **Vercel** `deml`        |
| Django BFF       | **Fly** `deml-backend`   |
| Streaming engine | **FORJD** Fly + Supabase |

Railway may host an optional standby for `deml-backend` only. Streaming,
projections, analytics, and ML run exclusively on FORJD — not on Railway.

See [`docs/FLY.md`](../../docs/FLY.md), [`docs/VERCEL.md`](../../docs/VERCEL.md),
and [`docs/FORJD_INTEGRATION.md`](../../docs/FORJD_INTEGRATION.md).

## Catalog

[`services.json`](./services.json) lists optional standby services and forbidden
data-plane names. Audit live vars with:

```bash
python scripts/railway_audit.py          # dry-run
python scripts/railway_audit.py --apply  # safe defaults + strip forbidden
```

Env hygiene: `python scripts/railway_env_cleanup.py --dry-run`.
