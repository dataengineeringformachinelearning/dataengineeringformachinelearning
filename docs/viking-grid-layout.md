# Viking-UI grid-first layout

Viking-UI provides three package-owned layout levels:

1. `viking-app-layout` owns application navigation, main content, optional
   tools, drawers, and split panels.
2. `viking-page-template` owns centered page width, page header/actions, and
   vertical route rhythm.
3. `viking-grid`, `viking-grid-item`, and `viking-column-layout` own content
   columns. `viking-container`, `viking-card`, and `viking-chart-panel` provide
   the uniform content inlay.

## Equal and intrinsic columns

Use `viking-column-layout` when sibling cards have equal visual weight. It
starts as one column and reaches the requested count as space becomes
available. Use `columns="auto"` when the number of tracks should follow the
container width rather than a device breakpoint.

```html
<viking-column-layout columns="3">
  <viking-card>Availability</viking-card>
  <viking-card>Latency</viking-card>
  <viking-card>Threat exposure</viking-card>
</viking-column-layout>

<viking-column-layout columns="auto" itemSize="wide">
  <viking-chart-panel>...</viking-chart-panel>
  <viking-chart-panel>...</viking-chart-panel>
</viking-column-layout>
```

Static consumers use the same contract:

```html
<div
  class="viking-column-layout viking-column-layout--auto viking-column-layout--item-compact"
>
  <article class="viking-card">...</article>
  <article class="viking-card">...</article>
</div>
```

## Twelve-column composition

Use the 12-track grid when regions have intentionally unequal weight. Mobile
span is declared first; tablet and desktop spans progressively enhance it.

```html
<viking-grid [columns]="12">
  <viking-grid-item [span]="12" [tabletSpan]="8" [desktopSpan]="9">
    <viking-chart-panel>Primary telemetry</viking-chart-panel>
  </viking-grid-item>
  <viking-grid-item [span]="12" [tabletSpan]="4" [desktopSpan]="3">
    <viking-container heading="Current posture">...</viking-container>
  </viking-grid-item>
</viking-grid>
```

## Centered containers

`viking-container` accepts `readable`, `default`, `wide`, and `full` width
contracts. It remains centered by default and owns its padding, border, radius,
and shadow.

```html
<viking-container
  width="readable"
  heading="Retention policy"
  description="Changes apply to every workspace projection."
>
  <viking-form-section>...</viking-form-section>
</viking-container>
```

## Before and after

Before, route-specific classes owned grid behavior and cards were visual
`div` elements:

```html
<div class="dashboard-grid dashboard-grid-responsive">
  <div class="analytics-panel">...</div>
  <div class="analytics-panel">...</div>
</div>
```

After, the package components own both layout and inlay:

```html
<viking-column-layout columns="auto" itemSize="wide">
  <viking-chart-panel>...</viking-chart-panel>
  <viking-chart-panel>...</viking-chart-panel>
</viking-column-layout>
```

Before, unequal dashboard regions required local span classes:

```html
<section class="dashboard-grid">
  <div class="span-8">...</div>
  <div class="span-4">...</div>
</section>
```

After, spans are explicit inputs with mobile-first fallbacks:

```html
<viking-grid [columns]="12">
  <viking-grid-item [span]="12" [desktopSpan]="8">...</viking-grid-item>
  <viking-grid-item [span]="12" [desktopSpan]="4">...</viking-grid-item>
</viking-grid>
```

Do not add page-specific `display`, `grid-template-columns`, gutter, card
padding, or max-width rules. Add missing layout behavior to these Viking-UI
contracts and consume it everywhere.
