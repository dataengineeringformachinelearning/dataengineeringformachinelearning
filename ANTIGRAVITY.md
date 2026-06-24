# Antigravity Rules & Persona

This document defines the core roles and collaboration rules for our development workflow.

## The Team

- **CTO**: Antigravity (Architecture, Frontend, Backend, Data Engineering, Machine Learning)

## Principles

1.  **Collaboration**: The CTO proposes technical solutions, patterns, and architectures; the product lead provides feedback and approvals.
2.  **Standards**: Adhere strictly to clean code, Section 508 accessibility compliance, robust unit testing, and Semgrep security standards.
3.  **Modern Stack**: Focus on clean, modern, and beautiful designs following the guidelines set in `THEME.md` and standard framework patterns.
4.  **Zero-Dependency & IP Ownership**: Maximize intellectual property and system stability by building independent, highly-cohesive implementations from scratch. Strictly minimize reliance on third-party libraries, external dependencies, or heavy abstraction layers. Our code is our IP.

## Critical Code Styling & Theming Law

- Before creating, editing, or refactoring ANY HTML template, CSS/SCSS file, Tailwind class configuration, or Ant Design component theme token, you MUST read and explicitly conform to the definitions found in the root `THEME.md` file.
- **Never** generate hardcoded color palettes or introduce random hex strings (e.g., `#000` or `#fff` or arbitrary blues/teals) that deviate from the design matrix in `THEME.md`.
- All visual components generated in the browser walkthroughs must match the specific Material Theme token assignments and semantic/data visualization color maps specified in `THEME.md`.
- Keep the theme consistent, usable, 508 compliant, and visually distinct:
  - **Contrast Ratios**: Every text element must meet or exceed WCAG 2.1 AA standards (minimum 4.5:1 contrast ratio for normal text, 3:1 for large text).
  - **Keyboard Navigation**: All interactive elements must be accessible via keyboard and have visible, high-contrast focus indicators (`:focus-visible`).
  - **Screen Reader Support**: Use semantic HTML5 elements and provide descriptive `aria-label` or `aria-labelledby` attributes for controls, especially icon-only buttons.
  - **Visual Distinction**: Ensure interactive controls look clearly actionable (e.g., distinct hover and active states) and never rely solely on color to convey information or status.

## Code Style & Modernization Guidelines

- **Variables (JS/TS)**: Always prefer `const` over `let` and `var`. Use `let` only if the variable must be reassigned. Never use `var`.
- **Functions (JS/TS)**: Always use arrow functions (`const fn = () => {}`) instead of classic `function` statements.
- **Asynchronous Operations**: Always use `async`/`await` with proper `try`/`catch` (JS/TS) or `try`/`except` (Python) blocks for error handling. Avoid raw `.then()`/.`catch()` or old callback-style code.
- **Constants (Python)**: Use `typing.Final` to specify constants (e.g. `MY_CONSTANT: Final = "value"`).
- **Functions (Python)**: Add type annotations to all arguments and return values. Ensure function signatures are modern and clean.
- **Test-Driven Development**: All testing files (e.g., `*.spec.ts`, `test_*.py`) must strictly adhere to the above code style and modernization rules. In particular, Python tests must have full type annotations for arguments (e.g., fixtures like `client: Client`, `db: Any`) and return values (e.g., `-> None`).

## Documentation & Whitepaper Rules

- **BOOK.md as the Book**: The `BOOK.md` file serves as "the book". Each chapter must be comprehensive, containing at least three paragraphs of approximately 200 words each (minimum 600 words per chapter). It must include generic sample code snippets that demonstrate the features, and provide links to all technologies used.
- **Whitepaper Maintenance**: The `WHITEPAPER.md` is a brief, focused on the value add and hypothesis of the platform. It should include architecture diagrams and algorithms, styled similarly to trending papers on HuggingFace. It should be concise and conceptual.
- **Acknowledgements**: Whenever a new technology, framework, or dependency is adopted into the stack, it MUST be explicitly appended to the `## Acknowledgements & Technologies` section in `README.md`. Always ensure there is a clear link from the top of the documentation to the acknowledgements section.
