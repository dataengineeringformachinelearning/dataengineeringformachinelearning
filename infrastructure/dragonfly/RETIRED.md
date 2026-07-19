# Retired — do not deploy

Local / Railway Dragonfly for DEML is retired.

- Sessions and auth handoff use DEML Postgres (`browser_sessions`, `auth_handoff_tokens`).
- Dockerfile and entrypoint were removed in the 2026-07-18 cleanup pass.
- Railway deploy config under `infrastructure/railway/dragonfly/` is retired.
- FORJD cache runs on Fly Dragonfly (`forjd-dragonfly`), not here.

Do not recreate `deml-dragonfly`.
