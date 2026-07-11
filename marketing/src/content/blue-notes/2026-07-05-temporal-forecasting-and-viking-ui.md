---
title: "Temporal forecasting arrives across the platform"
summary: A Norse spiking-neural-network forecaster moved from training infrastructure into live tenant-scoped status, analytics, and dashboard experiences.
publishedAt: 2026-07-05
note: Platform Note 003
categories:
  - Machine Learning
  - Forecasting
  - Viking-UI
featured: false
draft: false
---

## Forecasts become operational

DEML now runs live temporal inference from aggregated analytics sequences. The Spiking Temporal Forecaster uses time-dependent activity to estimate the direction of service health rather than looking only at the latest sample.

Forecasts are exposed through a dedicated API and appear on status pages, Explore, isolated public status views, and the authenticated dashboard. Results are cached per status page and remain scoped to the owning tenant.

## Model-lifecycle changes

- Training runs now record their model type, preventing SLA models and spiking models from overwriting or obscuring one another.
- Tenant model paths are resolved independently for training and inference.
- The ML worker can train one tenant or participate in the symmetrical account loop.
- Model artifacts continue to use safe state dictionaries rather than serialized executable objects.
- Placeholder overview inference was removed in favor of the real forecasting path.

## A shared interface language

The same release window consolidated the Viking-UI package across the marketing site, application, backend, and component showcase. Navigation, status cards, charts, forms, and publication pages now draw from one token and component source. Forecasting therefore appears with the same accessible visual language everywhere it is consumed.
