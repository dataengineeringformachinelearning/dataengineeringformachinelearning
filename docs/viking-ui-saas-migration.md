# Viking-UI modern SaaS migration

This migration moves DEML surfaces onto the grid-first Viking-UI foundation
without changing the Cyber-Noir or Ocean Blue Serenity color primitives. New
work must compose the package templates and semantic tokens; application-local
layout and component styling should be retired as each route is migrated.

## Target page anatomy

Use the same hierarchy on every authenticated surface:

```html
<viking-app-layout>
  <viking-page-template width="wide" [headerContent]="true">
    <div vikingPageTemplateHeader>Page title and supporting copy</div>
    <viking-cluster vikingPageTemplateActions justify="end">
      <viking-button variant="outline">Secondary action</viking-button>
      <viking-button variant="primary">Primary action</viking-button>
    </viking-cluster>

    <viking-stack vikingPageTemplateContent>
      <viking-section-template
        heading="Overview"
        description="Operational summary"
        layout="grid"
      >
        <viking-card>...</viking-card>
        <viking-chart-panel>...</viking-chart-panel>
      </viking-section-template>
    </viking-stack>
  </viking-page-template>
</viking-app-layout>
```

`viking-app-layout` owns application regions, sidebars, tools, and drawers.
`viking-page-template` owns page width, header/actions, and page rhythm.
`viking-section-template` owns section headings and local grid composition.
Cards, chart panels, form sections, and other content primitives own their
interior padding and borders. Pages should not add compensating wrappers.

## Migration sequence

1. Inventory each route for app-local page shells, card classes, button styles,
   raw grid/flex wrappers, and hardcoded spacing or radius values. Record the
   matching Viking primitive before changing markup.
2. Replace the outer shell first: `viking-app-layout`, then
   `viking-page-template`, then its named header, action, content, and footer
   regions. Remove page width and gutter rules now owned by the template.
3. Convert major content blocks to `viking-section-template`. Use `layout="grid"`
   for balanced two-column regions and nested `viking-grid columns="auto"` for
   content-led card collections. Use `viking-stack` for vertical flow and
   `viking-cluster` for action/filter rows.
4. Replace visual containers and controls with `viking-card`,
   `viking-chart-panel`, `viking-form-section`, `viking-field`, and
   `viking-button`. Delete the superseded local border, radius, shadow,
   padding, and hover rules instead of overriding the component.
5. Migrate one route family at a time: application shell and overview pages,
   operational dashboards, settings/forms, collection/detail pages, then
   marketing and documentation surfaces. Keep each change independently
   releasable.

## Acceptance checks per route

- Content aligns to the template gutter and shared column gaps at phone,
  tablet, desktop, and 200% zoom.
- Page title, section title, card title, body copy, and metadata have a clear
  five-level hierarchy without page-local font sizes.
- Interactive targets remain at least 44px on touch layouts and preserve the
  shared focus ring.
- Loading, empty, error, and populated states retain the same dimensions and
  do not introduce layout shift.
- No new app-local visual styles, hardcoded colors, one-off card/button
  classes, or third-party UI runtime dependencies remain.
- Viking-UI package build, tests, theme enforcement, mobile checks, and axe
  checks pass before a migrated route is considered complete.

## Compatibility policy

The numbered spacing aliases remain stable for existing consumers. New and
migrated components should use semantic roles such as
`--viking-space-control-gap`, `--viking-space-content-gap`,
`--viking-space-compact-gap`, `--viking-space-container-gap`,
`--viking-layout-column-gap`,
`--viking-card-padding`, and `--viking-page-section-gap`. This separates visual
decisions from scale mechanics and allows later density tuning without
rewriting page CSS.
