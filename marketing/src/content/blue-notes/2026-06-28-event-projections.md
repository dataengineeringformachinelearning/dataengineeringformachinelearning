---
title: "Projection health on the status surface"
summary: Platform status reflects FORJD readiness and sealed projection availability through the Django BFF.
publishedAt: 2026-06-28
note: Platform Note 013
categories:
  - Operations
  - FORJD
  - Status
---

Operators monitor sealed-path health through DEML’s public status surface and
FORJD `/ready`. Angular never calls FORJD with Firebase tokens; Django terminates
end-user auth and forwards with `fjsvc_`.

See [docs/PRODUCTION_CHECKLIST.md](../../../docs/PRODUCTION_CHECKLIST.md).
