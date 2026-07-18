# Railway — DEML user-plane topology

Canonical catalog: [`services.json`](./services.json).

After the FORJD cutover, Railway runs only the DEML user control plane:

| Service         | Role                                                                 |
| --------------- | -------------------------------------------------------------------- |
| `deml-backend`  | Optional Railway standby (primary API is **Fly** `deml-backend`)     |
| `deml-frontend` | Optional nginx CSR standby (primary UI is **Vercel** project `deml`) |

Primary Django host: **Fly.io** — see [`docs/FLY.md`](../../docs/FLY.md) (`backend/fly.toml`).
Primary Angular host: **Vercel** — see [`docs/VERCEL.md`](../../docs/VERCEL.md).
Sessions and auth handoff live in DEML Postgres (`browser_sessions`, `auth_handoff_tokens`).
Do **not** run `deml-dragonfly` — it is retired. FORJD’s Fly Dragonfly is unrelated.

Everything in `services.json` → `retired` must stay deleted (data plane lives on Fly/FORJD).

## Audit

```bash
# Dry-run (presence only; never prints secret values)
python scripts/railway_audit.py

# Strip forbidden legacy data-plane env from deml-backend
python scripts/railway_audit.py --apply --service deml-backend
```

## Cutover env (deml-backend)

Full checklist: [`docs/CUTOVER.md`](../../docs/CUTOVER.md).

Required:

```bash
railway variable set \
  FORJD_API_URL=https://backend.forjd.co \
  FORJD_TENANT_ID=<forjd-tenant-uuid> \
  FORJD_SERVICE_TOKEN=fjsvc_<prefix>_<secret> \
  FORJD_CUTOVER_PHASE=0 \
  --service deml-backend
```

### Postgres (Neon → Supabase consolidation)

DEML’s Django `DATABASE_URL` today is Neon. FORJD’s data plane already uses
Supabase. To host both in one Supabase project, restore DEML into schema `deml`
(never into `public`) using the FORJD runbook:

[`forjd/docs/NEON_TO_SUPABASE.md`](https://github.com/dataengineeringformachinelearning/forjd/blob/main/docs/NEON_TO_SUPABASE.md)

Then point Railway at the Supabase **pooler** URI with `search_path=deml,public`.
Keep Neon read-only for ≥ 7 days before delete.

Advance `FORJD_CUTOVER_PHASE` `0 → 1 → 2` without redeploying Angular. Phase `2`
is the steady state (`FORJD_WRITE_MODE=forjd`, `FORJD_READ_MODE=forjd`).

Forbidden (must be absent): `REDPANDA_BROKERS`, `CLICKHOUSE_HOST`, `RUSTFS_ENDPOINT`,
`CPE_GUESSER_URL`, `SCANNER_SERVICE_URL`, `DEML_ROLE`, `FORJD_TOKEN_URL`,
`FORJD_SERVICE_ACCOUNT_*`, `DRAGONFLY_HOST`, `REDIS_URL`, `REDISHOST`, `REDISPORT`,
`REDIS_SSL_CA`, `REDIS_SSL_CA_B64`.

After setting the token, map a DEML account (secret ref only):

```bash
railway run --service deml-backend -- \
  python manage.py map_forjd_tenant <deml-account-uuid> <forjd-tenant-uuid> \
  --service-token-secret-ref env:FORJD_SERVICE_TOKEN
```

## Retire leftover data-plane services

```bash
python scripts/railway_retire_dataplane.py          # dry-run
python scripts/railway_retire_dataplane.py --apply  # delete retired services
# (CLI: railway service delete --service <name> -y)
```

Do not recreate `deml-daemon`, `deml-cpe-guesser`, or any name in `services.json` → `retired`.
