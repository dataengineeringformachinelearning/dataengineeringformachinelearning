# Viking-UI Template-Driven Layout Migration

## Outcome

DEML uses one Cloudscape-inspired layout grammar implemented entirely by Viking-UI. Cloudscape is a structural quality reference, not a dependency or source-code donor. Viking-UI remains the sole owner of layout CSS, design tokens, Angular wrappers, and static cross-framework contracts.

## Canonical templates

| Contract                                                            | Responsibility                                                  | Consumer rule                                                  |
| ------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------- |
| `viking-app-layout`                                                 | Sidebar, content, tools, drawers, split panel, notifications    | One per application workspace shell                            |
| `viking-content-layout`                                             | Route breadcrumbs, notifications, header, actions, body, footer | Default for dashboard, resource, collection, and form routes   |
| `viking-page-template`                                              | Compatibility page width, gutters, section rhythm               | Migrate operational routes to `viking-content-layout`          |
| `viking-section`                                                    | Lightweight projected section host                              | Use for complex sections whose internal anatomy already exists |
| `viking-section-template`                                           | Heading, description, actions, divider, body                    | Default for new feature sections                               |
| `viking-card`, `viking-container`, `viking-box`, `viking-hud-panel` | Standardized surfaces and content grouping                      | Do not create app-local card/container recipes                 |
| `viking-grid`, `viking-column-layout`, `viking-switcher`            | Responsive symmetric composition                                | Choose intrinsic layout before adding breakpoints              |

## Completed migration

- The Angular root shell now uses `viking-app-layout` regions.
- All eleven Angular route templates use `viking-page-template` with named width and density.
- Major Angular sections use `viking-section-template`; operational panels use `viking-container`; repeated columns use `viking-column-layout`.
- Marketing and Viking-UI docs expose the shared app-layout classes at their layout boundary.
- Viking-UI docs register App Layout, Page Template, and Section Template as public showcase entries.
- All new visual rules live in `packages/viking-ui/src/styles/_templates.scss` and all geometry values resolve through `--viking-*` tokens.
- Dashboard and settings now use `viking-content-layout`; App Layout exposes controlled drawer and split-panel regions.

## Remaining file-by-file migration

### `marketing/src/pages/**/*.astro`

Retain `marketing/src/layouts/Layout.astro` as the only site chrome owner. As each page is touched, add `viking-section` to content sections and replace repeated card/header markup with existing Viking-UI static classes or Web Components. Do not add page-local styles; missing visual contracts belong in `packages/viking-ui/src/styles/surfaces/` or the canonical template stylesheet.

### `viking-ui-docs/src/pages/**/*.astro`

Retain `viking-ui-docs/src/layouts/DocLayout.astro` as the only documentation shell. The registry generates one continuous `/components` reference with anchored Section Template categories and Container-based component specimens; dedicated component detail routes are retired.

### `frontend/src/app/pages/**/*.html`

New top-level feature groups use `viking-section-template` with projected `vikingSectionActions`. Content panels use `viking-container`; lightweight nested groups use `viking-box`; equal or emphasized columns use `viking-column-layout`; route headers project through `vikingContentHeader`. Legacy selectors may remain only where they express specialized data visualization behavior, never page geometry or general spacing.

### `packages/viking-ui/src/styles/`

Keep widths, gutters, density, breakpoints, and surfaces tokenized. Consolidate legacy aliases only after repository-wide usage reaches zero. Responsive rules remain mobile-first, dense metric groups stay at a maximum of two columns, focus remains visible, and light/dark mode must change semantic token values rather than component structure.

## Verification gates

Run these after each migration slice:

```bash
npm run build:viking-ui:package
npm run build --prefix frontend
npm run build --prefix marketing
npm run build --prefix viking-ui-docs
node scripts/enforce-theme.js
node scripts/run_axe.js
```

The full pre-commit suite remains the release gate: `uvx pre-commit run --all-files`.

## Before and after

### Dashboard route interior

Before, dashboard geometry used the compatibility page template and a boolean header switch:

```html
<viking-page-template density="compact" width="wide" [headerContent]="true">
  <viking-page-header vikingPageTemplateHeader title="Command Center" />
  ...
</viking-page-template>
```

After, the route declares its operational content type and uses a stable named header region:

```html
<viking-content-layout type="dashboard" density="compact" width="wide">
  <viking-page-header vikingContentHeader title="Command Center" />
  <viking-section-template heading="Operational Overview"
    >...</viking-section-template
  >
</viking-content-layout>
```

### Settings route interior

Before, settings shared the generic page canvas with no resource-page semantics. After, it declares a compact resource layout; the same contract can add breadcrumbs or persistent save/error notifications without changing its section markup:

```html
<viking-content-layout type="resource" density="compact">
  <viking-page-header vikingContentHeader title="Sites" />
  <viking-callout vikingContentNotifications tone="warning">...</viking-callout>
  <viking-column-layout [columns]="2">...</viking-column-layout>
</viking-content-layout>
```

### Route shell: Analytics

Before, the page header and every section were loose siblings with local header classes:

```html
<div class="page-inner-wrapper">
  <viking-page-header title="System Analytics" />
  <div class="metrics-overview-header metrics-section-spacing">
    <h2 class="section-title-premium">Traffic Analytics</h2>
  </div>
  <div class="dashboard-grid dashboard-grid-responsive">...</div>
</div>
```

After, the route declares named page geometry and sections own their complete anatomy:

```html
<viking-page-template density="compact" width="wide" [headerContent]="true">
  <viking-page-header vikingPageTemplateHeader title="System Analytics" />
  <viking-section-template
    heading="Traffic Analytics"
    description="Geographic origins, frequency trends, and endpoint usage patterns."
    icon="traffic"
  >
    <viking-column-layout [columns]="2" [equalRows]="true"
      >...</viking-column-layout
    >
  </viking-section-template>
</viking-page-template>
```

### Dashboard panels

Before, panels repeated a card class, header wrapper, title, and action alignment:

```html
<section class="viking-card panel-card">
  <div class="panel-header">
    <h2>Recent Threats</h2>
    <viking-button>View all</viking-button>
  </div>
  <div class="panel-body">...</div>
</section>
```

After, Container owns the border, padding, heading hierarchy, and action slot:

```html
<viking-container heading="Recent Threats" icon="shield">
  <viking-button vikingContainerActions variant="ghost">View all</viking-button>
  <div class="panel-body">...</div>
</viking-container>
```

### Application shell

Before, the app manually coupled sidebar and content wrappers:

```html
<div class="dashboard-wrapper">
  <app-sidebar />
  <div class="dashboard-content"><router-outlet /></div>
</div>
```

After, the responsive shell owns collapse state, navigation, content, tools, and footer regions:

```html
<viking-app-layout [hasSidebar]="true" [hasTools]="true">
  <app-sidebar vikingAppLayoutSidebar />
  <router-outlet vikingAppLayoutContent />
  <app-context-tools vikingAppLayoutTools />
  <app-footer vikingAppLayoutFooter />
</viking-app-layout>
```

## Migration checklist

- [ ] Wrap operational routes in one `viking-content-layout` with named type, width, and density.
- [ ] Project route headers through `vikingContentHeader`; do not leave loose header siblings.
- [ ] Use `viking-section-template` for every major feature group.
- [ ] Use `viking-container` for titled panels and project actions through `vikingContainerActions`.
- [ ] Replace styled card `<div>` elements with `viking-card`.
- [ ] Replace page-owned grid classes with `viking-grid` or `viking-column-layout`.
- [ ] Keep dense metrics at one column when constrained and no more than two columns when wide.
- [ ] Use `viking-stack`, `viking-cluster`, or form primitives instead of margin/padding utilities.
- [ ] Add missing layout behavior to Viking-UI SCSS and semantic tokens, never app-local styles.
- [ ] Verify keyboard toggles, focus rings, landmarks, heading order, and 400% zoom.
- [ ] Run package tests, frontend build/lint, theme enforcement, mobile-first checks, and axe.
