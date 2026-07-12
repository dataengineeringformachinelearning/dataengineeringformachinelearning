# Viking-UI modern SaaS style guide

Viking-UI is a dark-first enterprise SaaS system. Cyber-Noir surfaces establish
depth; Ocean Blue is reserved for primary actions, selected states, links, and
focus. Components are quiet by default and communicate hierarchy through
spacing, one-pixel borders, stepped surfaces, and restrained elevation.

## Shared anatomy

- Controls are 40px high on desktop and retain a 44px touch target where touch
  interaction is expected.
- Buttons and inputs use an 8px radius. Cards, chart panels, tables, menus, and
  content containers use a 12px radius. Pills use the full-radius token only
  for badges and status chips.
- Component gaps use 8px; content stacks use 16px; card/container padding uses
  24px. Compact card inlay uses 16px.
- Default surfaces use a one-pixel semantic border. Static cards use the
  smallest neutral shadow; raised overlays use the small shadow.
- Hover changes background or border and may lift an interactive card or
  primary control by at most one pixel. No glow, rotation, bounce, gradient
  sweep, or perpetual status animation is part of the base system.
- Keyboard focus uses the Ocean Blue ring with a two-pixel offset and a soft
  three-pixel accent halo. Focus is never represented by color alone.

## Buttons

Buttons share one 40px control frame, 8px radius, 14px semibold label, and 8px
icon gap. Primary buttons use solid Ocean Blue. Outline buttons use the normal
surface and border. Ghost and subtle buttons acquire only the shared hover
surface; they do not gain decorative shadows.

## Inputs and forms

Inputs use a recessed Cyber-Noir surface, one-pixel border, and no resting
shadow. Hover raises contrast one step. Focus changes the border to Ocean Blue
and applies the shared focus ring. Labels, descriptions, and errors remain in
the `viking-field` stack so spacing and accessible associations stay uniform.

## Badges and status

Badges are 24px high with a compact full-radius shell. Tone backgrounds are
soft semantic tints with restrained borders. Accent badges use an Ocean Blue
tint and blue text rather than appearing as miniature primary buttons. Status
must always include readable text or an accessible label.

## Tables

Tables sit inside the same 12px content inlay as cards. Headers use 12px
semibold text without forced uppercase. Cells use 12px vertical and 16px
horizontal padding. Large tables maintain a readable minimum width and scroll
horizontally inside their container on constrained screens. Row hover uses a
six-percent Ocean Blue tint.

## Charts

Charts always live in `viking-chart-panel` for product dashboards. The panel
uses 16px padding when constrained and 16px/24px/24px inlay at 640px or wider.
Charts scale at a 16:7 ratio, use a responsive SVG view box, and remove internal
height caps that would crop plots. Grid, axes, legends, tooltips, empty states,
and loading states all use the shared surface and typography tokens.

## Headers and sidebars

Application headers use a 56px frame, centered wide container, subtle bottom
border, and 40px navigation targets. Navigation labels use normal casing. Hover
uses the shared hover surface; the active route uses the selected Ocean Blue
tint and accent border without glow.

Sidebars use the same surface, border, 40px item height, and 8px radius as other
navigation. Active items use the same selected-state contract as the header.
Health indicators are static semantic dots; movement is reserved for actual
progress or loading states.

## Layout composition

Routes compose `viking-app-layout` → `viking-page-template` →
`viking-column-layout` or `viking-grid`. Content is inlaid through
`viking-container`, `viking-card`, `viking-table`, or `viking-chart-panel`.
Application-local card, grid, control, and navigation visual systems are not
part of the contract.
