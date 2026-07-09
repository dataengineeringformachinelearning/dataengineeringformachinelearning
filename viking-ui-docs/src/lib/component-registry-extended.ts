import type { ShowcaseCategory } from "./component-registry";
import { getComponentApi } from "./component-api";

/** Additional documented components beyond the core gallery set. */
export const EXTENDED_SHOWCASE_CATEGORIES: ShowcaseCategory[] = [
  {
    id: "navigation",
    label: "Navigation",
    description: "Breadcrumbs, pagination, and wayfinding primitives.",
    components: [
      {
        id: "breadcrumbs",
        name: "Breadcrumbs",
        description: "Hierarchical path navigation with accessible separators.",
        preview: `<nav class="viking-breadcrumbs-static" aria-label="Breadcrumb">
  <ol class="viking-breadcrumbs-list">
    <li><a href="/">Home</a></li>
    <li><a href="/components">Components</a></li>
    <li aria-current="page">Auth panel</li>
  </ol>
</nav>`,
        snippets: {
          angular: `<viking-breadcrumbs>
  <viking-breadcrumb href="/">Home</viking-breadcrumb>
  <viking-breadcrumb>Components</viking-breadcrumb>
</viking-breadcrumbs>`,
          astro: `<nav class="viking-breadcrumbs-static" aria-label="Breadcrumb">...</nav>`,
          django: `<nav aria-label="Breadcrumb"><ol class="viking-breadcrumbs-list">...</ol></nav>`,
          javascript: `nav.setAttribute('aria-label', 'Breadcrumb');`,
        },
        selector: "viking-breadcrumbs",
      },
      {
        id: "pagination",
        name: "Pagination",
        description: "Page navigation with prev/next and numbered controls.",
        preview: `<nav class="viking-pagination-static" aria-label="Pagination">
  <button type="button" class="viking-btn viking-btn-outline viking-btn-compact">Previous</button>
  <span class="viking-label">Page 2 of 12</span>
  <button type="button" class="viking-btn viking-btn-outline viking-btn-compact">Next</button>
</nav>`,
        snippets: {
          angular: `<viking-pagination [page]="page" [totalPages]="12" (pageChange)="onPage($event)" />`,
          astro: `<nav class="viking-pagination-static" aria-label="Pagination">...</nav>`,
          django: `<nav aria-label="Pagination">{% include "partials/pagination.html" %}</nav>`,
          javascript: `// Use viking-pagination in Angular apps`,
        },
        selector: "viking-pagination",
      },
    ],
  },
  {
    id: "overlays",
    label: "Overlays & Sheets",
    description: "Drawers, popovers, and contextual menus.",
    components: [
      {
        id: "sheet",
        name: "Sheet",
        description: "Edge-anchored panel for mobile-first workflows.",
        preview: `<div class="viking-sheet-demo viking-card">
  <header class="viking-card-header"><h3 class="viking-heading viking-heading-sm">Filters</h3></header>
  <p class="viking-text-muted">Slide-over panel for retention and tenant filters.</p>
  <footer class="viking-demo-row">
    <viking-button-wc variant="primary">Apply</viking-button-wc>
    <viking-button-wc variant="outline">Reset</viking-button-wc>
  </footer>
</div>`,
        snippets: {
          angular: `<viking-sheet [(open)]="filtersOpen" side="right" title="Filters">...</viking-sheet>`,
          astro: `{/* Sheet requires Angular — use viking-sheet in deml.app */}`,
          django: `{# Mobile filter drawer via viking-sheet in Angular shell #}`,
          javascript: `// viking-sheet is Angular-only`,
        },
        selector: "viking-sheet",
        tags: ["angular"],
      },
      {
        id: "tooltip",
        name: "Tooltip",
        description: "Accessible hover/focus hints — never color alone.",
        preview: `<button type="button" class="viking-btn viking-btn-outline" title="Deploy to production via Outbox relay">
  Deploy
</button>`,
        snippets: {
          angular: `<button vikingTooltip="Deploy via Outbox relay">Deploy</button>`,
          astro: `<button type="button" title="Deploy via Outbox relay">Deploy</button>`,
          django: `<button type="button" title="{{ tooltip }}">Deploy</button>`,
          javascript: `el.setAttribute('title', 'Deploy via Outbox relay');`,
        },
        selector: "[vikingTooltip]",
        tags: ["angular", "directive"],
      },
    ],
  },
  {
    id: "advanced-forms",
    label: "Advanced Forms",
    description: "Switches, sliders, and multi-step flows.",
    components: [
      {
        id: "switch",
        name: "Switch",
        description:
          "Toggle control for binary settings with keyboard support.",
        preview: `<label class="viking-switch-static">
  <input type="checkbox" role="switch" checked />
  <span>Enable threat scoring</span>
</label>`,
        snippets: {
          angular: `<viking-switch [(checked)]="threatScoring">Enable threat scoring</viking-switch>`,
          astro: `<label class="viking-switch-static"><input type="checkbox" role="switch" /><span>Enable</span></label>`,
          django: `<label class="viking-switch-static"><input type="checkbox" role="switch" name="threat" /></label>`,
          javascript: `switch.setAttribute('role', 'switch');`,
        },
        selector: "viking-switch",
      },
      {
        id: "wizard",
        name: "Wizard",
        description:
          "Multi-step onboarding with progress and validation gates.",
        preview: `<div class="viking-wizard-demo viking-card">
  <div class="viking-progress" role="progressbar" aria-valuenow="33" aria-valuemin="0" aria-valuemax="100">
    <div class="viking-progress-bar viking-progress-value-33"></div>
  </div>
  <h3 class="viking-heading viking-heading-sm">Step 1 — Tenant setup</h3>
  <p class="viking-text-muted">Configure UUID isolation and retention policy.</p>
  <div class="viking-demo-row">
    <viking-button-wc variant="primary">Continue</viking-button-wc>
  </div>
</div>`,
        snippets: {
          angular: `<viking-wizard [steps]="onboardingSteps" [(stepIndex)]="step" />`,
          astro: `{/* Wizard requires Angular runtime */}`,
          django: `{# Multi-step forms via viking-wizard in deml.app #}`,
          javascript: `// viking-wizard is Angular-only`,
        },
        selector: "viking-wizard",
        tags: ["angular"],
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    description: "Kanban, timeline, and uptime visualization.",
    components: [
      {
        id: "kanban",
        name: "Kanban",
        description:
          "Drag-ready columns for incident and vulnerability triage.",
        preview: `<div class="viking-demo-full viking-kanban-demo">
  <div class="viking-kanban-col viking-card">
    <span class="viking-label">Open</span>
    <div class="viking-kanban-card">Semgrep: SQL injection</div>
  </div>
  <div class="viking-kanban-col viking-card">
    <span class="viking-label">In progress</span>
    <div class="viking-kanban-card">Trivy: distroless base</div>
  </div>
</div>`,
        snippets: {
          angular: `<viking-kanban [columns]="columns" [cards]="cards" />`,
          astro: `{/* Kanban requires Angular */}`,
          django: `{# Kanban board in security admin views #}`,
          javascript: `// viking-kanban is Angular-only`,
        },
        selector: "viking-kanban",
        tags: ["angular"],
      },
      {
        id: "uptime-bar",
        name: "Uptime bar",
        description:
          "Single uptime segment — compose into viking-uptime-history for full timelines.",
        preview: `<div class="viking-uptime-demo" role="img" aria-label="Uptime segment" style="width:100%">
  <div class="viking-uptime-segments">
    <span class="viking-uptime-seg viking-uptime-up" title="Operational"></span>
    <span class="viking-uptime-seg viking-uptime-up" title="Operational"></span>
    <span class="viking-uptime-seg viking-uptime-degraded" title="Partial outage"></span>
    <span class="viking-uptime-seg viking-uptime-up" title="Operational"></span>
    <span class="viking-uptime-seg viking-uptime-down" title="Major outage"></span>
    <span class="viking-uptime-seg viking-uptime-up" title="Operational"></span>
  </div>
  <span class="viking-badge viking-badge-success">99.97%</span>
</div>`,
        snippets: {
          angular: `<viking-uptime-bar status="operational" title="Apr 21 — 100%" />`,
          astro: `<div class="viking-uptime-demo" role="img" aria-label="Uptime history"><div class="viking-uptime-segments">...</div></div>`,
          django: `<div class="viking-uptime-demo">{% for seg in segments %}<span class="viking-uptime-seg viking-uptime-{{ seg.status }}"></span>{% endfor %}</div>`,
          javascript: `bar.setAttribute('status', 'operational');`,
        },
        selector: "viking-uptime-bar",
        related: ["uptime-history", "status-panel"],
      },
      {
        id: "uptime-history",
        name: "Uptime history",
        description:
          "Full-width 30-day uptime timeline with labeled header and date legend.",
        preview: `<div class="viking-uptime-demo" style="width:100%">
  <div style="display:flex;justify-content:space-between;width:100%">
    <span class="viking-label">Uptime</span>
    <span class="viking-text-muted">99.97% — No current issues</span>
  </div>
  <div class="viking-uptime-segments" role="img" aria-label="99.97% uptime last 30 days">
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-degraded"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
    <span class="viking-uptime-seg viking-uptime-up"></span>
  </div>
  <div style="display:flex;justify-content:space-between;width:100%;font-size:var(--viking-font-size-2xs);color:var(--viking-text-subtle)">
    <span>30 days ago</span>
    <span>Today</span>
  </div>
</div>`,
        snippets: {
          angular: `<viking-uptime-history [segments]="uptimeHistory" [percentage]="99.97" statusSummary="No current issues" />`,
          astro: `<div class="viking-uptime-demo">...</div>`,
          django: `<div class="viking-uptime-demo">{% include "partials/uptime_history.html" %}</div>`,
          javascript: `// Use viking-uptime-history in Angular apps`,
        },
        selector: "viking-uptime-history",
        tags: ["angular"],
        related: ["uptime-bar", "status-panel", "status-card"],
      },
      {
        id: "status-panel",
        name: "Status panel",
        description:
          "Service/component status card with header badge, metrics slot, and uptime timeline.",
        preview: `<div class="viking-card" style="width:100%;display:flex;flex-direction:column;gap:var(--viking-space-3)">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;width:100%;padding-bottom:var(--viking-space-2);border-bottom:1px solid var(--viking-border-subtle)">
    <div>
      <h3 class="viking-heading viking-heading-sm" style="margin:0">API Layer</h3>
      <p class="viking-text-muted" style="margin:var(--viking-space-1) 0 0">Core ingestion endpoints</p>
    </div>
    <viking-status-pill-wc tone="success" dot>Operational</viking-status-pill-wc>
  </div>
  <div class="viking-uptime-demo" style="width:100%">
    <div style="display:flex;justify-content:space-between;width:100%">
      <span class="viking-label">Uptime</span>
      <span class="viking-text-muted">100% — No current issues</span>
    </div>
    <div class="viking-uptime-segments" role="img" aria-label="100% uptime">
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
    </div>
    <div style="display:flex;justify-content:space-between;width:100%;font-size:var(--viking-font-size-2xs);color:var(--viking-text-subtle)">
      <span>30 days ago</span>
      <span>Today</span>
    </div>
  </div>
</div>`,
        snippets: {
          angular: `<viking-status-panel title="API Layer" status="Operational" statusTone="success" [uptimeSegments]="history" [uptimePercentage]="100" />`,
          astro: `{/* Status panel requires Angular runtime */}`,
          django: `{# Status panels in Angular status pages #}`,
          javascript: `// viking-status-panel is Angular-only`,
        },
        selector: "viking-status-panel",
        wcSelector: "viking-status-card-wc",
        tags: ["angular"],
        related: ["status-card", "uptime-history", "status-metric-row"],
      },
      {
        id: "status-card",
        name: "Status card",
        description:
          "Status page shell with title, operational badge, and full-width metric slots.",
        preview: `<viking-status-card-wc title="Platform Status" subtitle="Real-time telemetry and ML forecasting" status="Operational" status-tone="success" status-dot style="width:100%;display:block">
  <div class="viking-status-metric-row" style="width:100%;margin-bottom:var(--viking-space-2)">
    <span class="viking-label">Cumulative SLA</span>
    <strong class="viking-metric">99.97%</strong>
  </div>
  <div class="viking-uptime-demo" style="width:100%">
    <div class="viking-uptime-segments" role="img" aria-label="Uptime history">
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-degraded"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
      <span class="viking-uptime-seg viking-uptime-up"></span>
    </div>
  </div>
</viking-status-card-wc>`,
        snippets: {
          angular: `<viking-status-card title="Platform Status" subtitle="Real-time telemetry" status="Operational" statusTone="success" [statusDot]="true">...</viking-status-card>`,
          astro: `<viking-status-card-wc title="Platform Status" status="Operational" status-tone="success" status-dot>...</viking-status-card-wc>`,
          django: `<viking-status-card-wc title="{{ page.title }}" status="{{ page.status }}">...</viking-status-card-wc>`,
          javascript: `card.setAttribute('title', 'Platform Status');`,
        },
        selector: "viking-status-card",
        wcSelector: "viking-status-card-wc",
        related: ["status-panel", "status-metric-row", "uptime-history"],
      },
    ],
  },
];
