# Retired — do not deploy

`deml-dragonfly` is retired from the DEML Railway user plane.

- Sessions and auth handoff use DEML Postgres (`browser_sessions`, `auth_handoff_tokens`).
- Catalog entry lives under `services.json` → `retired`.
- Deployable Dockerfile/entrypoint under `infrastructure/dragonfly/` were removed.
- `railway.json` for this service was removed in the 2026-07-18 cleanup pass.
- Delete any live service with: `python scripts/railway_retire_dataplane.py --apply`

Do not recreate this service. FORJD cache runs on Fly Dragonfly, not here.
