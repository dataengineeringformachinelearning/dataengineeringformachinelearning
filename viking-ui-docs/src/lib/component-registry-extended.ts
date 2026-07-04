import type { ShowcaseCategory } from './component-registry';
import { getComponentApi } from './component-api';

/** Additional documented components beyond the core gallery set. */
export const EXTENDED_SHOWCASE_CATEGORIES: ShowcaseCategory[] = [
  {
    id: 'navigation',
    label: 'Navigation',
    description: 'Breadcrumbs, pagination, and wayfinding primitives.',
    components: [
      {
        id: 'breadcrumbs',
        name: 'Breadcrumbs',
        description: 'Hierarchical path navigation with accessible separators.',
        preview: `<nav class="viking-breadcrumbs-static" aria-label="Breadcrumb">
  <ol class="viking-breadcrumbs-list">
    <li><a href="/">Home</a></li>
    <li aria-current="page">Components</li>
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
        selector: 'viking-breadcrumbs',
      },
      {
        id: 'pagination',
        name: 'Pagination',
        description: 'Page navigation with prev/next and numbered controls.',
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
        selector: 'viking-pagination',
      },
    ],
  },
  {
    id: 'overlays',
    label: 'Overlays & Sheets',
    description: 'Drawers, popovers, and contextual menus.',
    components: [
      {
        id: 'sheet',
        name: 'Sheet',
        description: 'Edge-anchored panel for mobile-first workflows.',
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
        selector: 'viking-sheet',
        tags: ['angular'],
      },
      {
        id: 'tooltip',
        name: 'Tooltip',
        description: 'Accessible hover/focus hints — never color alone.',
        preview: `<button type="button" class="viking-btn viking-btn-outline" title="Deploy to production via Outbox relay">
  Deploy
</button>`,
        snippets: {
          angular: `<button vikingTooltip="Deploy via Outbox relay">Deploy</button>`,
          astro: `<button type="button" title="Deploy via Outbox relay">Deploy</button>`,
          django: `<button type="button" title="{{ tooltip }}">Deploy</button>`,
          javascript: `el.setAttribute('title', 'Deploy via Outbox relay');`,
        },
        selector: '[vikingTooltip]',
        tags: ['angular', 'directive'],
      },
    ],
  },
  {
    id: 'advanced-forms',
    label: 'Advanced Forms',
    description: 'Switches, sliders, and multi-step flows.',
    components: [
      {
        id: 'switch',
        name: 'Switch',
        description: 'Toggle control for binary settings with keyboard support.',
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
        selector: 'viking-switch',
      },
      {
        id: 'wizard',
        name: 'Wizard',
        description: 'Multi-step onboarding with progress and validation gates.',
        preview: `<div class="viking-wizard-demo viking-card">
  <div class="viking-progress" role="progressbar" aria-valuenow="33" aria-valuemin="0" aria-valuemax="100">
    <div class="viking-progress-bar" style="width: 33%"></div>
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
        selector: 'viking-wizard',
        tags: ['angular'],
      },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    description: 'Kanban, timeline, and uptime visualization.',
    components: [
      {
        id: 'kanban',
        name: 'Kanban',
        description: 'Drag-ready columns for incident and vulnerability triage.',
        preview: `<div class="viking-kanban-demo">
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
        selector: 'viking-kanban',
        tags: ['angular'],
      },
      {
        id: 'uptime-bar',
        name: 'Uptime bar',
        description: 'Status history strip with tone + label — never color alone.',
        preview: `<div class="viking-uptime-demo" role="img" aria-label="99.97% uptime last 90 days">
  <div class="viking-uptime-segments">
    <span class="viking-uptime-seg viking-uptime-up" title="Up"></span>
    <span class="viking-uptime-seg viking-uptime-up" title="Up"></span>
    <span class="viking-uptime-seg viking-uptime-degraded" title="Degraded"></span>
    <span class="viking-uptime-seg viking-uptime-up" title="Up"></span>
  </div>
  <span class="viking-badge viking-badge-success">99.97%</span>
</div>`,
        snippets: {
          angular: `<viking-uptime-bar [segments]="uptimeSegments" [label]="'99.97%'" />`,
          astro: `<div class="viking-uptime-demo" role="img" aria-label="Uptime history">...</div>`,
          django: `<div class="viking-uptime-demo">{% for seg in segments %}<span class="viking-uptime-seg"></span>{% endfor %}</div>`,
          javascript: `bar.setAttribute('role', 'img');`,
        },
        selector: 'viking-uptime-bar',
        api: getComponentApi('uptime-bar'),
      },
    ],
  },
];
