# Project Theme and Design System

This document outlines the core semantic color tokens, typography, and visual styling rules for the application.

---

## 1. Core Color Palette

These are the semantic tokens used across the application for both light and dark modes, adhering to the "Lab Coat" minimalist aesthetic (high contrast, clean, scientific precision).

/_ CSS HEX _/
--jet-black: #31393cff;
--crayola-blue: #2176ffff;
--blue-bell: #33a1fdff;
--golden-pollen: #fdca40ff;
--carrot-orange: #f79824ff;
--white: #ffffff;
--black: #000000;

/_ CSS HSL _/
--jet-black: hsla(196, 10%, 21%, 1);
--crayola-blue: hsla(217, 100%, 56%, 1);
--blue-bell: hsla(207, 98%, 60%, 1);
--golden-pollen: hsla(44, 98%, 62%, 1);
--carrot-orange: hsla(33, 93%, 55%, 1);

/_ SCSS HEX _/
$jet-black: #31393cff;
$crayola-blue: #2176ffff;
$blue-bell: #33a1fdff;
$golden-pollen: #fdca40ff;
$carrot-orange: #f79824ff;

/_ SCSS HSL _/
$jet-black: hsla(196, 10%, 21%, 1);
$crayola-blue: hsla(217, 100%, 56%, 1);
$blue-bell: hsla(207, 98%, 60%, 1);
$golden-pollen: hsla(44, 98%, 62%, 1);
$carrot-orange: hsla(33, 93%, 55%, 1);

/_ SCSS RGB _/
$jet-black: rgba(49, 57, 60, 1);
$crayola-blue: rgba(33, 118, 255, 1);
$blue-bell: rgba(51, 161, 253, 1);
$golden-pollen: rgba(253, 202, 64, 1);
$carrot-orange: rgba(247, 152, 36, 1);

/_ SCSS Gradient _/
$gradient-top: linear-gradient(0deg, #31393cff, #2176ffff, #33a1fdff, #fdca40ff, #f79824ff);
$gradient-right: linear-gradient(90deg, #31393cff, #2176ffff, #33a1fdff, #fdca40ff, #f79824ff);
$gradient-bottom: linear-gradient(180deg, #31393cff, #2176ffff, #33a1fdff, #fdca40ff, #f79824ff);
$gradient-left: linear-gradient(270deg, #31393cff, #2176ffff, #33a1fdff, #fdca40ff, #f79824ff);
$gradient-top-right: linear-gradient(45deg, #31393cff, #2176ffff, #33a1fdff, #fdca40ff, #f79824ff);
$gradient-bottom-right: linear-gradient(135deg, #31393cff, #2176ffff, #33a1fdff, #fdca40ff, #f79824ff);
$gradient-top-left: linear-gradient(225deg, #31393cff, #2176ffff, #33a1fdff, #fdca40ff, #f79824ff);
$gradient-bottom-left: linear-gradient(315deg, #31393cff, #2176ffff, #33a1fdff, #fdca40ff, #f79824ff);
$gradient-radial: radial-gradient(#31393cff, #2176ffff, #33a1fdff, #fdca40ff, #f79824ff);

---

## 2. Typography and Layout

- Base font size: **16px minimum** for main content (`--base-font-size`); **14px** for bold UI chrome (`--ui-font-size`).
- Spacing uses an **8px grid** (`--grid-unit`, `--space-1` through `--space-8`).
- Design **mobile-first**: default styles target small screens; use `@media (min-width: …)` to scale up.
- Header letter spacing should use negative/smaller spacing (`letter-spacing: -0.02em` or similar) to ensure a clean, modern look.
- Use bold, high-contrast typography to emphasize metrics and data over decorative elements.

## 3. UI Component Aliases (Unified mapping)

For convenience, these generic architectural aliases map dynamically to the active mode's core semantic tokens:

- `--primary-color` maps to `--crayola-blue`
- `--accent-color` maps to `--blue-bell`
- `--hover-color` maps to `--golden-pollen`
- `--bg-color` maps to dark or light backgrounds (jet-black or white)
- `--text-color` maps to white or jet-black
- `--card-bg` maps to slightly elevated backgrounds

## 4. UI Elements and Material Design Guidelines

To guarantee layout consistency and a pixel-perfect feel, follow these guidelines:

- **Buttons**: Always use `--crayola-blue` background and `--white` text.
- **Hover effects**: Use sharp, precise interactions. Avoid diffuse glows or muddy shadows. Use stark contrast shifts or solid bottom borders.
- **Borders**: Must be extremely light/subtle in both modes to create a sterile, clinical division of space without visual clutter.
- **Backgrounds**: Do not use glowing orbs, gradients, or ambient noise. Backgrounds must be pure `#ffffff` (light mode) or `#121212` (dark mode) to focus entirely on data.
- **Emojis**: Emojis are strictly prohibited throughout the entire project to maintain a highly professional, clinical appearance. The _only_ exception to this rule is the American flag emoji (🇺🇸), which is permitted for use in specific badges (e.g., "Made in the U.S.A").

## 5. Video Feeds

- Styled to resemble YouTube video players with specific, clean border overlays and aspect ratios.
