---
title: "Viking-UI Premium Theme: Dark-First Engineering Aesthetic"
summary: "The Viking-UI design system introduces aerospace-inspired dark themes, machined metallic borders, and WCAG 2.1 AA compliance across all DEML surfaces."
publishedAt: 2025-03-01
note: Platform Note 005
categories:
  - Viking-UI
  - Design
  - Accessibility
  - CSS
featured: false
draft: false
---

## What shipped

- **Charcoal/teal/crimson palette** with `--viking-*` CSS custom properties
- **Mobile-first 8px grid** system (no CLS layout shifts)
- **Native SVG telemetry charts** (zero-dependency visualization)
- **WCAG 2.1 AA automation** via `@axe-core/cli` in pre-commit hooks

## Design principles

- **Dark-first**: Charcoal backgrounds with teal/crimson accents
- **Machined precision**: Metallic borders, restrained shadows, no decorative clutter
- **Zero dependencies**: No Material, Bootstrap, or utility frameworks
- **Composable primitives**: `viking-button`, `viking-field`, `viking-card`, etc.

## Technical details

The package exports multiple consumption paths:

- **Angular**: `@dataengineeringformachinelearning/viking-ui` npm package
- **Web Components**: `/web-components.js` for framework-neutral use
- **Static CSS**: `/viking-ui.css` bundle for Django templates
- **CDN**: jsDelivr for external site embedding

This unified the frontend, docs, and backend under a single design language.
