# Project Theme and Design System

This document outlines the core semantic color tokens, typography, and visual styling rules for the application. The system supports both a "dark-first" Material Design aesthetic and a high-contrast, clean light mode using a deep green and soft sage palette.

---

## 1. Dark Mode Configuration (Default)

### Core Color Palette

These are the primary semantic tokens used across the application when running in Dark Mode.

| Token                          | Hex       | Description                                                          |
| ------------------------------ | --------- | -------------------------------------------------------------------- |
| `--color-primary`              | `#2d4739` | Primary brand color (Deep Green). Used for key actions and branding. |
| `--color-on-primary`           | `#FFFFFF` | Text/icons displayed on top of the primary color.                    |
| `--color-primary-container`    | `#c0c5c1` | Softer background for secondary emphasis (Soft Sage).                |
| `--color-on-primary-container` | `#0f1814` | Text/icons on the primary container.                                 |
| `--color-surface`              | `#182821` | Background color for cards, dialogs, and elevated components.        |
| `--color-on-surface`           | `#E8ECEA` | Text/icons on surface backgrounds.                                   |
| `--color-background`           | `#0f1814` | The main page background color.                                      |
| `--color-on-background`        | `#E8ECEA` | The main text color for the application.                             |

### Semantic Status Colors

Used for notifications, alerts, and system feedback in Dark Mode.

| Token             | Hex       | Usage                                                              |
| ----------------- | --------- | ------------------------------------------------------------------ |
| `--color-success` | `#4CAF50` | Positive feedback, success states.                                 |
| `--color-warning` | `#FFC107` | Caution, warnings. Acts strictly as the status color for warnings. |
| `--color-error`   | `#F44336` | Errors, destructive actions.                                       |
| `--color-info`    | `#2196F3` | Informational messages.                                            |

### Shadows & Elevation

Shadows are used to create depth in the dark-first design, applying subtle glows instead of harsh drops.

- `--shadow-sm`: `0 2px 8px rgba(0, 0, 0, 0.4)`
- `--shadow-md`: `0 4px 16px rgba(0, 0, 0, 0.5)`
- `--shadow-hover`: `0 8px 24px rgba(0, 0, 0, 0.6)`
- `--shadow-glow`: `0 0 12px rgba(159, 184, 173, 0.3)`

---

## 2. Light Mode Configuration

### Core Color Palette

These are the primary semantic tokens optimized for high contrast, deep-green accents, and readability against a clean light background.

| Token                          | Hex       | Description                                                                           |
| ------------------------------ | --------- | ------------------------------------------------------------------------------------- |
| `--color-primary`              | `#2d4739` | Primary brand color (Deep Green). Used for key actions, primary buttons, and headers. |
| `--color-on-primary`           | `#FFFFFF` | Text/icons displayed on top of the primary color (High contrast 8.7:1 ratio).         |
| `--color-primary-container`    | `#E1E6E2` | Light sage accent background for subtle secondary emphasis.                           |
| `--color-on-primary-container` | `#1A2B22` | Dark forest green text/icons on the primary container.                                |
| `--color-surface`              | `#FFFFFF` | Pure white background color for cards, dialogs, and elevated components.              |
| `--color-on-surface`           | `#182821` | Deep forest green text/icons on surface backgrounds.                                  |
| `--color-background`           | `#F4F7F5` | Very pale, clean sage/off-white main page background.                                 |
| `--color-on-background`        | `#182821` | The main high-contrast text color for the application (High contrast 13.4:1 ratio).   |

### Semantic Status Colors

Used for notifications, alerts, and system feedback. These have been slightly deepened to ensure accessible text contrast ratios against light backgrounds.

| Token             | Hex       | Usage                                                                  |
| ----------------- | --------- | ---------------------------------------------------------------------- |
| `--color-success` | `#2E7D32` | Positive feedback, success states.                                     |
| `--color-warning` | `#FFC107` | Caution, warnings. Used only for status badges and warning indicators. |
| `--color-error`   | `#D32F2F` | Errors, destructive actions.                                           |
| `--color-info`    | `#0288D1` | Informational messages.                                                |

### Shadows & Elevation

In light mode, heavy dark shadows look muddy. These tokens use soft, diffused, realistic drop shadows with a transparent deep-green tint.

- `--shadow-sm`: `0 2px 4px rgba(24, 40, 33, 0.08)`
- `--shadow-md`: `0 4px 12px rgba(24, 40, 33, 0.12)`
- `--shadow-hover`: `0 8px 24px rgba(24, 40, 33, 0.16)`
- `--shadow-glow`: `0 0 12px rgba(45, 71, 57, 0.15)`

---

## 3. UI Component Aliases (Unified mapping)

For convenience, these generic architectural aliases map dynamically to the active mode's core semantic tokens:

- `--primary-color` maps to `--color-primary`
- `--accent-color` maps to `--color-primary-container`
- `--hover-color` maps to:
  - _(Dark Mode)_ `--color-surface`
  - _(Light Mode)_ `--color-primary-container` (provides a soft tint on hover)
- `--bg-color` maps to `--color-background`
- `--text-color` maps to `--color-on-background`
- `--text-muted` maps to:
  - _(Dark Mode)_ `--color-primary-container`
  - _(Light Mode)_ `#4a5450` (ensures a compliant contrast ratio of 5.8:1 against white surfaces)
- `--card-bg` maps to `--color-surface`
- `--border` maps to:
  - _(Dark Mode)_ `--color-surface`
  - _(Light Mode)_ `#C8D3CE` (a crisp, structural light sage border token)

---

## 4. UI Elements and Material Design Guidelines

To guarantee layout consistency and a pixel-perfect feel, follow these guidelines:

### Buttons

- **Primary Buttons**: Always use `--color-primary` background and `--color-on-primary` text.
- **Secondary / Accent Buttons**: Always use `--color-primary-container` background and `--color-on-primary-container` text. Do not hardcode opacity or background values.
- **Dark Grey Action Buttons**: For utility actions (like navbar Sign In/Out, dashboard manage buttons, service additions, and modal submits), use `--color-dark-grey-btn-bg` and `--color-dark-grey-btn-text` to ensure high contrast and avoid warning colors on interactive controls.
- **Button Shape**: Material Design pill shape (`border-radius: 100px` for standard CTA buttons, `border-radius: 20px` for smaller actions and forms, and `border-radius: 8px` for modal submits and list actions).

### Cards & Surfaces

- Surfaces (`.page-content`, cards, dialogs) must use `var(--card-bg)` for the background and `var(--border)` for borders.
- Cards must use `var(--shadow-sm)` by default, transitioning smoothly to `var(--shadow-hover)` and `transform: translateY(-2px)` on hover.

### Page Decoratives (Glow Spheres)

- In Dark Mode, use high-fidelity atmospheric glows to suggest advanced AI computation. In Light Mode, keep accents soft and forest-toned to ensure reading comfort.

### SaaS Grid & Modular Spacing (Precision style)

To make everything look modularly slotted in with perfect visual cohesiveness, components must use standard layout tokens:

- **Spacing Variables**:
  - `--grid-gap`: `2rem` (for spacing between major page sections and card grids).
  - `--card-padding`: `1.5rem` (for internal padding of all panels and status cards).
  - `--container-max-width`: `1100px` (for unified page content boundary).
- **Component Radii & Transitions**:
  - `--border-radius-lg`: `20px` (for landing grids, simulators, and feature cards).
  - `--border-radius-md`: `12px` (for standard status cards, tables, and dialogs).
  - `--border-radius-sm`: `8px` (for form fields, small buttons, and items).
  - `--transition-smooth`: `all 0.3s cubic-bezier(0.4, 0, 0.2, 1)` (for elegant micro-interactions).
- **Equal Gaps**: Grid layouts and flex rows must strictly use `var(--grid-gap)` or `var(--card-padding)` to maintain modular slot-in visual alignment across all screens.

---

## 5. Technical Instrumentation & Glow Styling Tokens

To elevate the dark-first visual look of the application to a premium, high-performance console state, we define the following specialized tokens:

- **Industrial Amber**:
  - `--color-amber`: `#ffb74d` (Dark), `#b07219` (Light) — represents glowing console panels and active telemetry.
- **Instrument Gauge Red**:
  - `--color-gauge-red`: `#d5001c` — used for critical status lines, needles, and high-importance alerts.
- **Precision Tones**:
  - `--color-border-precision`: `rgba(255, 255, 255, 0.08)` (Dark), `rgba(24, 40, 33, 0.12)` (Light) — razor-sharp borders for precision instrument panel spacing.

---

## 6. Implementation

The central source of truth for the frontend styling is located in `frontend/src/theme.scss`.
Backend Django templates share a similar methodology within `backend/static/styles.css`.

When building new components, **always use the CSS variables** defined above instead of hardcoding hex values. This ensures that the application can seamlessly transition between themes at runtime and maintains a consistent visual aesthetic.
