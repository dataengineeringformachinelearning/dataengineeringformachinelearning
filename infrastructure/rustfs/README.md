# DEML RustFS (report object store)

**Role:** S3-compatible blob storage for analytics export artifacts (PDF, CSV, Parquet, JSON).
**Upstream:** [rustfs/rustfs](https://github.com/rustfs/rustfs) (Apache 2.0)
**Design doc:** [BOOK.md § Appendix O](../../BOOK.md#appendix-o-analytics-exports--rustfs-object-store)

RustFS replaces archived MinIO CE for new DEML object-store work. It is **not** the system of record for analytics facts — **ClickHouse + Postgres** remain the BI sources; RustFS only stores **generated files**.

## Ports

| Port   | Purpose                                       |
| ------ | --------------------------------------------- |
| `9000` | S3 API                                        |
| `9001` | Web console (disable in production if unused) |

Local docker-compose maps host **`9100` → 9000** and **`9101` → 9001** so ClickHouse can keep container port `9000`.

## Local (docker compose)

```bash
docker compose up -d rustfs
# Console: http://localhost:9101  (default keys from compose — change for anything shared)
# S3 API:  http://localhost:9100
```

Default **dev-only** credentials (override via env):

- `RUSTFS_ACCESS_KEY` / `RUSTFS_SECRET_KEY` (compose defaults are for local only)

Create the exports bucket once (console or `mc` / AWS CLI):

```bash
# example with AWS CLI against local RustFS
export AWS_ACCESS_KEY_ID=deml-rustfs-dev
export AWS_SECRET_ACCESS_KEY=deml-rustfs-dev-secret-change-me
aws --endpoint-url http://localhost:9100 s3 mb s3://deml-exports
```

## Application env (backend + workers)

| Variable                  | Example (local)      | Notes                                                     |
| ------------------------- | -------------------- | --------------------------------------------------------- |
| `RUSTFS_ENDPOINT`         | `http://rustfs:9000` | In-compose service DNS; host uses `http://localhost:9100` |
| `RUSTFS_ACCESS_KEY`       | _(secret)_           | S3 access key                                             |
| `RUSTFS_SECRET_KEY`       | _(secret)_           | S3 secret key                                             |
| `RUSTFS_BUCKET`           | `deml-exports`       | Default exports bucket                                    |
| `RUSTFS_REGION`           | `us-east-1`          | Required by many SDKs; value is conventional              |
| `RUSTFS_USE_SSL`          | `false`              | `true` when endpoint is HTTPS                             |
| `RUSTFS_ADDRESSING_STYLE` | `path`               | Prefer path-style for self-hosted S3                      |

Python clients use `backend/utils/object_storage.py` (boto3).

## Railway (`deml-rustfs`)

1. Create service from catalog (`infrastructure/railway/services.json` → `deml-rustfs`).
2. Attach a **persistent volume** at `/data`.
3. Set strong `RUSTFS_ACCESS_KEY` / `RUSTFS_SECRET_KEY`.
4. Prefer private networking: backend/workers use `http://deml-rustfs.railway.internal:9000`.
5. Do **not** expose the console publicly without auth hardening; prefer private only.

## Security

- Never put root keys in the frontend.
- Browser downloads use short-lived Django-signed proxy URLs; owner checks live in Django
  `ExportJob` rows and RustFS remains on private service DNS.
- Object keys: `accounts/{account_id}/exports/{job_id}/{filename}` — UUID isolation.
- Change all default credentials before any non-local use.
- Project is young relative to MinIO; pin image tags and re-test S3 features after upgrades.

## Upgrade

1. Read [RustFS releases](https://github.com/rustfs/rustfs/releases).
2. Bump pin in `infrastructure/rustfs/Dockerfile`.
3. Smoke-test: put object, head, presigned GET, list prefix.
4. Deploy `deml-rustfs`, then bounce consumers if needed.
