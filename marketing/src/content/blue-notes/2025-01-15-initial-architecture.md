---
title: "Initial Architecture: Django Backend and Angular Frontend Scaffolding"
summary: "The foundational commit established the core Django/Angular monorepo structure with PostgreSQL models, REST API endpoints, and initial Viking-UI component system."
publishedAt: 2025-01-15
note: Platform Note 002
categories:
  - Foundation
  - Architecture
  - Django
  - Angular
featured: false
draft: false
---

## What shipped

The first functional commit laid out the monorepo architecture with:

- **Django REST Framework API** with Ninja schema for OpenAPI generation
- **Angular SSR frontend** with standalone components and signal-based state
- **PostgreSQL models** for tenants, endpoints, incidents, and status pages
- **Viking-UI component library** with design tokens and dark-first aesthetic

## Key architectural decisions

- **Monorepo structure**: Single repository managing frontend, backend, Firebase functions, and infrastructure
- **Event-driven core**: Redpanda Kafka for high-throughput event streams
- **Multi-tenancy**: UUID-based tenant isolation with symmetrical pipelines
- **Security-first**: Firebase Auth, JWT middleware, and CSP-hardened templates

## Why it mattered

This commit established the framework constraints that shaped every subsequent decision: no pickle for models, state dict serialization, distroless containers, and WCAG 2.1 AA compliance as non-negotiable standards.
