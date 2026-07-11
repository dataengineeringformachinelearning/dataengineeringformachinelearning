# Analytics exports & RustFS object store

**Status:** infrastructure, client, `ExportJob` model/API/worker, and Analytics UI exports panel.
**Object store:** [RustFS](https://github.com/rustfs/rustfs) (Apache 2.0, S3-compatible)
**Ops:** [`infrastructure/rustfs/README.md`](../infrastructure/rustfs/README.md)
**Catalog:** `deml-rustfs` in [`infrastructure/railway/services.json`](../infrastructure/railway/services.json)

## Why RustFS (not MinIO, not a lakehouse)

| Option                  | Decision                                                              |
| ----------------------- | --------------------------------------------------------------------- |
| MinIO CE                | **Avoid** — upstream community repo archived / unmaintained (2026)    |
| Garage                  | Solid Rust alternative; we chose RustFS for S3-shaped DX + Apache 2.0 |
| Delta / Iceberg / Unity | **Not for downloads** — lake table formats, not tenant PDF storage    |
| S3 / R2                 | Valid managed fallback; same client (`boto3` path-style)              |
| **RustFS**              | **Selected** self-hosted S3 for report **blobs**                      |

**Facts vs files**

- **ClickHouse + Postgres** = analytics truth (BI queries, CES, telemetry aggregates).
- **RustFS** = durable **files** (PDF / CSV / Parquet / JSON) after a job runs.
- **Firestore** = live UI projections — not an archive for multi‑MB reports.

## Architecture

```text
  Angular ──POST /api/v1/exports──► deml-backend (Django Ninja)
                                          │
                                          │ ExportJob (queued)  [next]
                                          ▼
                                    deml-workers
                               Polars + CH/PG → render
                                          │
                          put_bytes ──────► deml-rustfs (S3 API :9000)
                          storage_uri ────► ExportJob ready
                                          │
  Angular ◄── presigned GET (TTL) ──────── deml-backend
```

### Object key layout

```text
accounts/{account_id}/exports/{job_id}/{filename}
```

Implemented in `backend/utils/object_storage.export_object_key`.

### Client

| Surface    | Module                                     |
| ---------- | ------------------------------------------ |
| Settings   | `RUSTFS_*` in `backend/config/settings.py` |
| Helpers    | `backend/utils/object_storage.py`          |
| Dependency | `boto3` in `backend/requirements.txt`      |

## Local development

```bash
docker compose up -d rustfs
# S3 API   http://localhost:9100
# Console  http://localhost:9101  (dev keys from compose — not for prod)
```

Backend / workers (compose) receive:

```text
RUSTFS_ENDPOINT=http://rustfs:9000
RUSTFS_ACCESS_KEY=…
RUSTFS_SECRET_KEY=…
RUSTFS_BUCKET=deml-exports
RUSTFS_REGION=us-east-1
RUSTFS_USE_SSL=false
```

Host processes outside compose use `RUSTFS_ENDPOINT=http://localhost:9100`.

Create the bucket once (console or AWS CLI):

```bash
export AWS_ACCESS_KEY_ID=deml-rustfs-dev
export AWS_SECRET_ACCESS_KEY=deml-rustfs-dev-secret-change-me
aws --endpoint-url http://localhost:9100 s3 mb s3://deml-exports
```

Or from Django shell after `ensure_bucket()` when credentials are set.

## Railway

Service name: **`deml-rustfs`**

1. Deploy from `infrastructure/rustfs/Dockerfile` (pinned RustFS image).
2. Attach a **volume** at `/data`.
3. Set strong `RUSTFS_ACCESS_KEY` / `RUSTFS_SECRET_KEY`.
4. Point backend + workers:

   ```text
   RUSTFS_ENDPOINT=http://deml-rustfs.railway.internal:9000
   RUSTFS_BUCKET=deml-exports
   RUSTFS_USE_SSL=false
   ```

5. Keep console disabled publicly (`RUSTFS_CONSOLE_ENABLE=false` default in catalog).

## Security invariants

- Owner/RBAC checks on every export create/list/download (app layer).
- Short-lived **presigned GET** (default 15 minutes in client helpers).
- No frontend access to root keys.
- Prefix isolation by `account_id` UUID.
- Retention: expire objects + mark jobs expired (worker task — follow-up).

## Implemented surfaces

| Piece   | Location                                                                   |
| ------- | -------------------------------------------------------------------------- |
| Model   | `monitor.ExportJob` + migration `0043_export_job`                          |
| API     | `GET/POST /api/v1/exports`, `GET /api/v1/exports/{id}`, `GET .../download` |
| Service | `monitor/services/exports.py` (CSV/JSON/Parquet/PDF)                       |
| Command | `python manage.py generate_export` (+ optional `--job-id`)                 |
| Workers | `generate_export` in `ALLOWED_TASKS`                                       |
| UI      | Analytics page exports panel                                               |

## Risk note

RustFS is younger than historical MinIO. **Pin image tags**, smoke-test presign after upgrades, and keep the client endpoint-abstract so a future Garage/R2 swap is env-only.
