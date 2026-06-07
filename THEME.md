# Project Theme and Design System

This document outlines the core semantic color tokens, typography, and visual styling rules for the application. The system supports both a "dark-first" Material Design aesthetic and a high-contrast, clean light mode using a deep green and soft sage palette.

---

## 1. Dark Mode Configuration (Default)

### Core Color Palette

These are the primary semantic tokens used across both the frontend and backend when the application is running in Dark Mode.

| Token | Hex | Description |
| --- | --- | --- |
| `--color-primary` | `#2d4739` | Primary brand color (Deep Green). Used for key actions and branding. |
| `--color-on-primary` | `#FFFFFF` | Text/icons displayed on top of the primary color. |
| `--color-primary-container`| `#c0c5c1` | Softer background for secondary emphasis (Soft Sage). |
| `--color-on-primary-container` | `#0f1814` | Text/icons on the primary container. |
| `--color-surface` | `#182821` | Background color for cards, dialogs, and elevated components. |
| `--color-on-surface` | `#E8ECEA` | Text/icons on surface backgrounds. |
| `--color-background` | `#0f1814` | The main page background color. |
| `--color-on-background`| `#E8ECEA` | The main text color for the application. |

### Semantic Status Colors

Used for notifications, alerts, and system feedback in Dark Mode.

| Token | Hex | Usage |
| --- | --- | --- |
| `--color-success` | `#4CAF50` | Positive feedback, success states. |
| `--color-warning` | `#FFC107` | Caution, warnings. Also acts as the unified yellow accent color for the Status & Manage dashboards. |
| `--color-error` | `#F44336` | Errors, destructive actions. |
| `--color-info` | `#2196F3` | Informational messages. |

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

| Token | Hex | Description |
| --- | --- | --- |
| `--color-primary` | `#2d4739` | Primary brand color (Deep Green). Used for key actions, primary buttons, and headers. |
| `--color-on-primary` | `#FFFFFF` | Text/icons displayed on top of the primary color. |
| `--color-primary-container`| `#E1E6E2` | Light sage accent background for subtle secondary emphasis. |
| `--color-on-primary-container` | `#1A2B22` | Dark forest green text/icons on the primary container. |
| `--color-surface` | `#FFFFFF` | Pure white background color for cards, dialogs, and elevated components. |
| `--color-on-surface` | `#182821` | Deep forest green text/icons on surface backgrounds. |
| `--color-background` | `#F4F7F5` | Very pale, clean sage/off-white main page background. |
| `--color-on-background`| `#182821` | The main high-contrast text color for the application. |

### Semantic Status Colors

Used for notifications, alerts, and system feedback. These have been slightly deepened to ensure accessible text contrast ratios against light backgrounds.

| Token | Hex | Usage |
| --- | --- | --- |
| `--color-success` | `#2E7D32` | Positive feedback, success states. |
| `--color-warning` | `#ED6C02` | Caution, warnings. Also acts as the unified yellow accent color for the Status & Manage dashboards. |
| `--color-error` | `#D32F2F` | Errors, destructive actions. |
| `--color-info` | `#0288D1` | Informational messages. |

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
  - *(Dark Mode)* `--color-surface`
  - *(Light Mode)* `--color-primary-container` (provides a soft tint on hover)
- `--bg-color` maps to `--color-background`
- `--text-color` maps to `--color-on-background`
- `--card-bg` maps to `--color-surface`
- `--border` maps to:
  - *(Dark Mode)* `--color-surface`
  - *(Light Mode)* `#D1D8D4` (a crisp, structural light border token)

---

## 4. Implementation

The central source of truth for the frontend styling is located in `frontend/src/theme.scss`. 
Backend Django templates share a similar methodology within `backend/static/styles.css`.

When building new components, **always use the CSS variables** defined above instead of hardcoding hex values. This ensures that the application can seamlessly transition between themes at runtime and maintains a consistent visual aesthetic.