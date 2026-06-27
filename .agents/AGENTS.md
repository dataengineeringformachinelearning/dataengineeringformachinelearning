# Agent Rules for Data Engineering for Machine Learning

## CORS and Dynamic Domains

- **NEVER** hardcode customer or tenant domains into `CORS_ALLOWED_ORIGINS` in `backend/config/settings.py` or any other configuration file.
- The platform uses a unified, dynamic CORS resolution system.
- For Django endpoints, origin validation is automatically handled via `django-cors-headers` signals which rely on `monitor.cors_utils.is_domain_registered`. This checks the Postgres database (`Tenant`, `ValidatedSite`, `MonitoredService`, `Endpoints`).
- If a domain needs to be allowed, it MUST be registered in the database via the application's models, not hardcoded into configuration files.
- The OpenTelemetry Collector (`infrastructure/otel-collector`) is the only exception; it is configured to accept all origins (`*`) dynamically, and invalid telemetry is filtered downstream.

## Core Architectural Invariants

- **Tenant0 UUID Normalization:** Never use string literals like `"platform"` as foreign keys in background workers or telemetry payloads. The `NetworkTelemetryMiddleware` explicitly intercepts legacy `"platform"` requests and dynamically maps them to the native UUID of Tenant0 (`is_platform_tenant=True`). This guarantees that Redpanda/Kafka streams and Polars aggregations operate on a homogenous stream of valid UUIDs end-to-end, preventing database foreign key constraint errors downstream.
- **Symmetrical Multi-Tenant Pipelines:** When authoring background workers, cron workers, or OSINT scanners, NEVER hardcode execution exclusively for the platform. You must ALWAYS structure the pipeline to iterate dynamically over `Tenant.objects.all()`. Because the platform itself is cleanly bootstrapped as Tenant0, this guarantees that both the core infrastructure and individual customer environments are processed symmetrically within the exact same loop, eliminating architectural debt and hardcoded exceptions.
- **Data Enrichments & Critical Path:** Data enrichments and features must meet Tenant0 standards and follow the system design path of the platform so all tenant data benefits. The explicit pipeline process is: **collect, enhance, aggregate, showcase** to the user. The final processed results must be written to a dedicated table for snappy, optimized access via the UI. This ensures the "critical path of the application" remains highly responsive while delivering deep, enriched insights to the user.

## Antigravity Rules & Persona

This document defines the core roles and collaboration rules for our development workflow.

### The Team

- **CTO**: Antigravity (Architecture, Frontend, Backend, Data Engineering, Machine Learning)

### Principles

1.  **Collaboration**: The CTO proposes technical solutions, patterns, and architectures; the product lead provides feedback and approvals.
2.  **Standards**: Adhere strictly to clean code, Section 508 accessibility compliance, robust unit testing, and Semgrep security standards.
3.  **Modern Stack**: Focus on clean, modern, and beautiful designs following the guidelines set in `THEME.md` and standard framework patterns.
4.  **Zero-Dependency & IP Ownership**: Maximize intellectual property and system stability by building independent, highly-cohesive implementations from scratch. Strictly minimize reliance on third-party libraries, external dependencies, or heavy abstraction layers. Our code is our IP.

### Critical Code Styling & Theming Law

- Before creating, editing, or refactoring ANY HTML template, CSS/SCSS file, Tailwind class configuration, or Ant Design component theme token, you MUST read and explicitly conform to the definitions found in the root `THEME.md` file.
- **Never** generate hardcoded color palettes or introduce random hex strings (e.g., `#000` or `#fff` or arbitrary blues/teals) that deviate from the design matrix in `THEME.md`.
- All visual components generated in the browser walkthroughs must match the specific Material Theme token assignments and semantic/data visualization color maps specified in `THEME.md`.
- Keep the theme consistent, usable, 508 compliant, and visually distinct:
  - **Contrast Ratios**: Every text element must meet or exceed WCAG 2.1 AA standards (minimum 4.5:1 contrast ratio for normal text, 3:1 for large text).
  - **Keyboard Navigation**: All interactive elements must be accessible via keyboard and have visible, high-contrast focus indicators (`:focus-visible`).
  - **Screen Reader Support**: Use semantic HTML5 elements and provide descriptive `aria-label` or `aria-labelledby` attributes for controls, especially icon-only buttons.
  - **Visual Distinction**: Ensure interactive controls look clearly actionable (e.g., distinct hover and active states) and never rely solely on color to convey information or status.

### Code Style & Modernization Guidelines

- **Variables (JS/TS)**: Always prefer `const` over `let` and `var`. Use `let` only if the variable must be reassigned. Never use `var`.
- **Functions (JS/TS)**: Always use arrow functions (`const fn = () => {}`) instead of classic `function` statements.
- **Asynchronous Operations**: Always use `async`/`await` with proper `try`/`catch` (JS/TS) or `try`/`except` (Python) blocks for error handling. Avoid raw `.then()`/.`catch()` or old callback-style code.
- **Constants (Python)**: Use `typing.Final` to specify constants (e.g. `MY_CONSTANT: Final = "value"`).
- **Functions (Python)**: Add type annotations to all arguments and return values. Ensure function signatures are modern and clean.
- **Test-Driven Development**: All testing files (e.g., `*.spec.ts`, `test_*.py`) must strictly adhere to the above code style and modernization rules. In particular, Python tests must have full type annotations for arguments (e.g., fixtures like `client: Client`, `db: Any`) and return values (e.g., `-> None`).

### Documentation & Whitepaper Rules

- **BOOK.md as the Book**: The `BOOK.md` file serves as "the book". Each chapter must be comprehensive, containing at least three paragraphs of approximately 200 words each (minimum 600 words per chapter). It must include generic sample code snippets that demonstrate the features, and provide links to all technologies used.
- **Whitepaper Maintenance**: The `WHITEPAPER.md` is a brief, focused on the value add and hypothesis of the platform. It should include architecture diagrams and algorithms, styled similarly to trending papers on HuggingFace. It should be concise and conceptual.
- **Acknowledgements**: Whenever a new technology, framework, or dependency is adopted into the stack, it MUST be explicitly appended to the `## Acknowledgements & Technologies` section in `README.md`. Always ensure there is a clear link from the top of the documentation to the acknowledgements section.
