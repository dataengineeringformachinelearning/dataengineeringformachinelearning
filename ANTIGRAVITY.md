# Antigravity Workspace Rules

## System & Architecture
- Platform: Angular UI (Latest stable)

## Critical Code Styling & Theming Law
- Before creating, editing, or refactoring ANY HTML template, CSS/SCSS file, Tailwind class configuration, or Ant Design component theme token, you MUST read and explicitly conform to the definitions found in the root `THEME.md` file.
- **Never** generate hardcoded color palettes or introduce random hex strings (e.g., `#000` or `#fff` or arbitrary blues/teals) that deviate from the design matrix in `THEME.md`.
- All visual components generated in the browser walkthroughs must match the specific Material Theme token assignments and semantic/data visualization color maps specified in `THEME.md`.