# Viking-UI

Publish target: **`@dataengineeringformachinelearning/viking-ui@6.1.0`**
Single source of truth: **`packages/viking-ui/`** (framework-agnostic styles, tokens, Web Components, and Angular wrapper entrypoints are consolidated here).

Universal DEML component library for Astro, Angular, and Django.

This release reflects the DEML premium restrained luxury visual direction with machined borders, high-contrast depth, and restrained teal/crimson accents.

## Architecture

- `src/styles/_variables.scss` defines the canonical `--viking-*` design tokens.
- `src/styles/components-bundle.scss` defines static CSS primitives shared by every app.
- `src/tokens/viking-tokens.json` exposes the same token contract for tooling.
- `src/web/` contains framework-neutral Web Components with Shadow DOM style isolation.
- `src/web-components/index.ts` is the script-bundle entry that registers those Web Components for Astro, Django, static HTML, and external hosts.
- `src/lib/` contains Angular standalone wrappers, services, and CVA helpers exported from the package root and `./angular`.
- `dist/icons.js` and `dist/site-drakkar.js` are framework-neutral utility bundles for static-site consumers that should not load Angular.
- `dist/design-tokens.css`, `dist/viking-components.css`, `dist/deml-components.css`, `dist/viking-ui.css`, `dist/viking-tokens.json`, `dist/web-components.js`, `dist/viking-ui-elements.js`, and `dist/widget.js` are the built artifacts.
- `dist/viking-ui.css` is the full app bundle. Load it once per surface; do not stack it with the split CSS artifacts.

### Reusable layout composition

Angular surfaces can compose whole pages without defining app-local layout
styles. The layout components map directly to the same token-owned classes used
by Astro, Django, and plain HTML:

```html
<viking-page-shell>
  <viking-page-header
    title="Operations"
    subtitle="Live service health and risk"
  />
  <viking-section>
    <viking-stack spacing="compact">
      <viking-grid [columns]="3" [equalRows]="true">
        <viking-card>Availability</viking-card>
        <viking-card>Latency</viking-card>
        <viking-card>Risk</viking-card>
      </viking-grid>
      <viking-cluster justify="end">
        <viking-button variant="primary">Review</viking-button>
      </viking-cluster>
    </viking-stack>
  </viking-section>
</viking-page-shell>
```

Static surfaces use the matching `.page-inner-wrapper`, `.viking-section`,
`.viking-stack`, `.viking-grid`, and `.viking-cluster` classes from
`viking-ui.css`. Responsive breakpoints, spacing density, equal-row behavior,
and action alignment therefore stay in the package instead of drifting across
applications.

## Build

```bash
npm run build --prefix packages/viking-ui
npm run test:viking-ui:package
```

## Status Monitoring Components

Viking-UI includes standalone Angular status-page primitives for cohesive, full-width
monitoring surfaces. They are token-based and inherit light/dark mode from the
global Viking theme, so consuming apps should not add Tailwind or app-local visual
classes around them.

```ts
import {
  AnnouncementCardComponent,
  ExploreCardComponent,
  StatusBadgeComponent,
  StatusDashboardComponent,
  StatusSectionComponent,
  UptimeHistoryComponent,
  type ExploreCardMetric,
  type ExploreCardUptimePoint,
  VikingMetricCard,
  type StatusBadgeVariant,
  type StatusDashboardAnnouncement,
  type StatusDashboardMetric,
  type StatusDashboardService,
  type UptimeHistoryDataPoint,
  type VikingUptimeSegment,
} from "@dataengineeringformachinelearning/viking-ui";
```

```html
<viking-status-section
  title="Operational — joealongi"
  description="All systems are functioning normally."
  status="operational"
  liveLabel="Live Predictions Active"
>
  <section class="viking-status-section-block">
    <h3 class="viking-status-section-heading">Latest System Announcements</h3>
    <viking-announcement-card
      tone="info"
      title="Sanity.io Integration Active"
      publishedAt="2026-06-13"
    >
      Announcements are now served globally from edge CDNs.
    </viking-announcement-card>
  </section>

  <section class="viking-status-section-block">
    <div class="viking-status-section-metrics">
      <viking-metric-card
        icon="clock"
        label="Response Time"
        value="158.71ms"
        sublabel="Latest observation"
        tone="info"
      />
      <viking-metric-card
        icon="shield-check"
        label="Uptime"
        value="100.00%"
        sublabel="30-day SLA"
        tone="success"
      />
    </div>

    <viking-uptime-history
      [data]="last30Days"
      [height]="24"
      [showLabels]="true"
    />
  </section>
</viking-status-section>
```

```ts
const last30Days: UptimeHistoryDataPoint[] = Array.from(
  { length: 30 },
  (_, index) => {
    const date = new Date("2026-06-08T00:00:00Z");
    date.setUTCDate(date.getUTCDate() + index);
    return {
      date: date.toISOString().slice(0, 10),
      status: index === 12 ? "partial" : index === 21 ? "down" : "up",
    };
  },
);
```

Core types:

- `StatusBadgeVariant`: `operational | degraded | outage | maintenance`
- `StatusDashboardMetric`: `icon`, `label`, `value`, optional `sublabel`, `tone`
- `StatusDashboardService`: service name, status, latency, uptime, and 30-day history
- `StatusDashboardAnnouncement`: title/body, `info | warning`, and optional publish date
- `ExploreCardMetric`: icon, label, value, optional sublabel/tone for public cards
- `ExploreCardUptimePoint`: `{ date: string; status: 'up' | 'down' | 'partial' }`
- `UptimeHistoryDataPoint`: `{ date: string; status: 'up' | 'down' | 'partial' }`
- `VikingUptimeSegment`: `{ date?: string; status: string; uptime?: number }`
- `AnnouncementCardComponent` tones: `info | warning`

### Cohesive Status Dashboard

```html
<viking-status-dashboard
  title="Operational — joealongi"
  description="All systems are functioning normally."
  status="operational"
  statusLabel="Operational"
  liveLabel="Live Predictions Active"
  [metrics]="statusMetrics"
  [services]="statusServices"
  [announcements]="statusAnnouncements"
  [showThemeVersions]="true"
/>
```

```ts
const historyFor = (
  partialIndex: number,
  downIndex: number,
): UptimeHistoryDataPoint[] =>
  Array.from({ length: 30 }, (_, index) => {
    const date = new Date("2026-06-08T00:00:00Z");
    date.setUTCDate(date.getUTCDate() + index);
    return {
      date: date.toISOString().slice(0, 10),
      status:
        index === downIndex
          ? "down"
          : index === partialIndex
            ? "partial"
            : "up",
    };
  });

const statusMetrics: StatusDashboardMetric[] = [
  {
    icon: "server",
    label: "SLA",
    value: "99.99%",
    sublabel: "30-day service level",
    tone: "success",
  },
  {
    icon: "clock",
    label: "Latency",
    value: "158.71ms",
    sublabel: "Latest observation",
    tone: "info",
  },
  {
    icon: "bar-chart",
    label: "Requests",
    value: "2.4M",
    sublabel: "Last 24 hours",
  },
  {
    icon: "trending-up",
    label: "Forecast",
    value: "100.00%",
    sublabel: "Predicted SLA",
  },
];

const statusServices: StatusDashboardService[] = [
  {
    name: "Primary Site",
    url: "https://joealongi.dev",
    status: "operational",
    statusLabel: "Operational",
    latency: "158.71ms",
    uptime: "100.00%",
    history: historyFor(12, 21),
  },
  {
    name: "API Gateway",
    url: "https://api.deml.app",
    status: "degraded",
    statusLabel: "Partial",
    latency: "212.08ms",
    uptime: "99.94%",
    history: historyFor(7, 22),
  },
];

const statusAnnouncements: StatusDashboardAnnouncement[] = [
  {
    tone: "info",
    title: "Sanity.io Integration Active",
    publishedAt: "2026-06-13",
    body: "Announcements are served globally from edge CDNs for lightning-fast status page updates.",
  },
];
```

### Explore Public Status Card

```html
<viking-explore-card
  title="joealongi.dev"
  description="Public status for the primary site, API gateway, and edge announcement feed."
  href="/status/platform-status"
  status="operational"
  statusLabel="Operational"
  [proVerified]="true"
  [metrics]="exploreMetrics"
  [uptimeHistory]="exploreUptime"
  [uptimePercentage]="100"
  uptimeSummary="No current issues"
/>
```

```ts
const exploreMetrics: ExploreCardMetric[] = [
  {
    icon: "server",
    label: "Cumulative SLA",
    value: "100.00%",
    sublabel: "Based on real telemetry",
    tone: "success",
  },
  {
    icon: "clock",
    label: "P99 Latency",
    value: "158.71ms",
    sublabel: "Last 24h",
    tone: "info",
  },
  {
    icon: "trending-up",
    label: "Spike Risk",
    value: "0.08",
    sublabel: "Dynamic Temporal Forecasting",
  },
  {
    icon: "shield",
    label: "Threat Anomaly",
    value: "0.00%",
    sublabel: "Active",
  },
];

const exploreUptime: ExploreCardUptimePoint[] = Array.from(
  { length: 30 },
  (_, index) => {
    const date = new Date("2026-06-08T00:00:00Z");
    date.setUTCDate(date.getUTCDate() + index);
    return {
      date: date.toISOString().slice(0, 10),
      status: index === 18 ? "partial" : "up",
    };
  },
);
```

## Storybook and Chromatic

Storybook is the release-grade visual cockpit for the Web Component layer and
publishing workflow.

```bash
npm run build-storybook --workspace @dataengineeringformachinelearning/viking-ui

# Requires CHROMATIC_PROJECT_TOKEN
npm run chromatic --workspace @dataengineeringformachinelearning/viking-ui
```

Chromatic snapshots publish from `packages/viking-ui/storybook-static` and cover
mobile, tablet, and desktop widths.

## Versioning

Viking-UI uses Changesets from the repository root:

```bash
npm run changeset
npm run version:viking-ui
```

See [docs/viking-ui-release.md](../../docs/viking-ui-release.md) for the full
release, visual regression, and propagation workflow.

## Consumption

### 1) NPM usage (recommended for apps)

Use this for app-first surfaces such as deml.app, internal dashboards, and any build chain that supports package installs.

```ts
import "@dataengineeringformachinelearning/viking-ui/viking-ui.css";
```

```ts
import {
  VikingButton,
  VikingInput,
  VikingModal,
} from "@dataengineeringformachinelearning/viking-ui/angular";
```

```bash
npm install @dataengineeringformachinelearning/viking-ui
```

For Angular components, continue using the exported Angular APIs and theme tokens as normal.

```ts
import {
  VikingButton,
  VikingInput,
  VikingModal,
} from "@dataengineeringformachinelearning/viking-ui";

// or when building custom element demos:
import "@dataengineeringformachinelearning/viking-ui/web-components.js";
import "@dataengineeringformachinelearning/viking-ui/viking-ui.css";
```

Framework-neutral utility imports are available without pulling in Angular:

```ts
import { resolveVikingIcon } from "@dataengineeringformachinelearning/viking-ui/icons";
import { SITE_NAV_LINKS } from "@dataengineeringformachinelearning/viking-ui/site-drakkar";
import tokens from "@dataengineeringformachinelearning/viking-ui/tokens.json";
```

### 2) jsDelivr CDN usage (recommended for widgets and quick embeds)

Use this for external websites, marketing snippets, and widget-style integrations that should load without npm.

The package artifacts are published in `dist/`, so you can load them directly from jsDelivr:

### 1) CSS only

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@6.1.0/dist/viking-ui.css"
/>
```

### 2) Web Components only

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@6.1.0/dist/web-components.js"
></script>
```

### 3) CSS + Web Components together

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@6.1.0/dist/viking-ui.css"
/>
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@6.1.0/dist/web-components.js"
></script>
```

### 4) Version pinning

Use `@latest` for latest stable assets, or replace it with a concrete version for locked
builds.

```html
<!-- Latest -->
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@6.1.0/dist/viking-ui.css"
/>
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@6.1.0/dist/web-components.js"
></script>
```

```html
<!-- Pinned -->
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@6.1.0/dist/viking-ui.css"
/>
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@6.1.0/dist/web-components.js"
></script>
```

### 5) Full minimal HTML example (copy/paste)

```html
<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Viking-UI CDN demo</title>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@6.1.0/dist/viking-ui.css"
    />
    <script
      type="module"
      src="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@6.1.0/dist/web-components.js"
    ></script>
  </head>
  <body>
    <main class="page-inner-wrapper viking-stack viking-stack--loose">
      <h1 class="viking-heading viking-heading-xl">Viking widget</h1>
      <viking-card-wc compact>
        <h2 class="viking-heading viking-heading-sm">Widget card</h2>
        <p class="viking-text-muted">
          Works in marketing pages and external websites.
        </p>
      </viking-card-wc>
      <viking-button-wc variant="primary">Open dashboard</viking-button-wc>
    </main>
  </body>
</html>
```

### 3) When to use the sync script

Use `scripts/sync_design_system.py` when you need synced static assets instead of npm:

```bash
python scripts/sync_design_system.py
```

This path remains for surfaces that are not using package installs directly, especially
legacy or Django-rendered templates that consume `/assets/viking-ui.css` and shared class names.

### 6) Status widget via jsDelivr (no npm install)

Use this when embedding a live status badge on external pages:

```html
<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>DEML Status Widget</title>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@6.1.0/dist/viking-ui.css"
    />
    <script
      type="module"
      src="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@6.1.0/dist/web-components.js"
    ></script>
    <script
      src="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@6.1.0/dist/widget.js"
      async
      defer
      data-page-id="platform-status"
      data-backend-url="https://api.example.com"
      data-frontend-url="https://deml.app"
    ></script>
  </head>
  <body></body>
</html>
```

Pinned release example:

```html
<script
  src="https://cdn.jsdelivr.net/npm/@dataengineeringformachinelearning/viking-ui@6.1.0/dist/widget.js"
  async
  defer
  data-page-id="platform-status"
  data-backend-url="https://api.example.com"
  data-frontend-url="https://deml.app"
></script>
```

Replace `api.example.com` with your backend URL and update `data-page-id` / `data-frontend-url` for your status page.

This package is the source of truth. Angular wrappers live in `packages/viking-ui/src/lib`, framework-neutral Web Components live in `packages/viking-ui/src/web`, shared utility exports live under `packages/viking-ui/src/core`, and token/build artifacts are emitted from this package. Astro and Django consume package artifacts directly through npm, CDN, or synced static assets.

Angular app shells consume the package CSS from `angular.json`:

```json
{
  "styles": [
    "@dataengineeringformachinelearning/viking-ui/viking-ui.css",
    "src/styles.scss"
  ]
}
```

Django, marketing, and showcase static assets are copied from `packages/viking-ui/dist` by:

```bash
python scripts/sync_design_system.py
node scripts/validate_viking_ui_assets.mjs
```

See [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) for the rebuild phases.
