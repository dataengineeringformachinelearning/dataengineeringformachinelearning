import type { ComponentApi } from './component-api';
import { getComponentApi } from './component-api';
import type { FrameworkTab } from './site';

export type ComponentSnippet = Record<FrameworkTab, string>;

export type ShowcaseComponent = {
  id: string;
  name: string;
  description: string;
  preview: string;
  snippets: ComponentSnippet;
  tags?: string[];
  /** Angular element selector */
  selector?: string;
  /** Web Component tag when available */
  wcSelector?: string;
  /** Structured API reference — use getComponentApi(id) or override */
  api?: ComponentApi;
  /** Related components for cross-linking on detail pages */
  related?: string[];
};

export type ShowcaseCategory = {
  id: string;
  label: string;
  description: string;
  components: ShowcaseComponent[];
};

const btnSnippets = (label = 'Launch sequence'): ComponentSnippet => ({
  angular: `import { VikingButton } from '@dataengineeringformachinelearning/viking-ui';

<viking-button variant="primary">${label}</viking-button>
<viking-button variant="secondary">Secondary</viking-button>
<viking-button variant="outline">Outline</viking-button>
<viking-button variant="danger">Danger</viking-button>`,
  astro: `---
// Load tokens + Web Components in your layout
---
<viking-button-wc variant="primary">${label}</viking-button-wc>
<viking-button-wc variant="secondary">Secondary</viking-button-wc>`,
  django: `<button type="button" class="viking-btn viking-btn-primary">${label}</button>
<button type="button" class="viking-btn viking-btn-secondary">Secondary</button>
<button type="button" class="viking-btn viking-btn-outline">Outline</button>`,
  javascript: `<viking-button-wc variant="primary">${label}</viking-button-wc>

<script type="module" src="/assets/viking-ui-elements.js"><\/script>`,
});

const inputSnippets: ComponentSnippet = {
  angular: `import { VikingField, VikingInput } from '@dataengineeringformachinelearning/viking-ui';

<viking-field label="Mission ID" [required]="true">
  <viking-input type="text" placeholder="DEML-2049" />
</viking-field>`,
  astro: `<viking-input-wc
  placeholder="Mission ID"
  name="mission"
  clearable
></viking-input-wc>`,
  django: `<div class="viking-field">
  <label class="viking-field-label" for="mission-id">Mission ID</label>
  <div class="viking-input-shell">
    <input id="mission-id" class="viking-input-native" type="text" placeholder="DEML-2049" />
  </div>
</div>`,
  javascript: `<viking-input-wc placeholder="Mission ID" name="mission" clearable></viking-input-wc>`,
};

import { EXTENDED_SHOWCASE_CATEGORIES } from './component-registry-extended';
import { FULL_SHOWCASE_CATEGORIES } from './component-registry-full';
import { PARITY_SHOWCASE_CATEGORIES } from './component-registry-parity';

export const SHOWCASE_CATEGORIES: ShowcaseCategory[] = [
  {
    id: 'foundations',
    label: 'Foundations',
    description: 'Buttons, badges, typography, and surface primitives.',
    components: [
      {
        id: 'button',
        name: 'Button',
        description: 'Primary actions with variant, size, loading, and icon support.',
        preview: `<div class="viking-demo-row">
  <viking-button-wc variant="primary">Primary</viking-button-wc>
  <viking-button-wc variant="secondary">Secondary</viking-button-wc>
  <viking-button-wc variant="outline">Outline</viking-button-wc>
  <viking-button-wc variant="danger">Danger</viking-button-wc>
  <viking-button-wc variant="ghost">Ghost</viking-button-wc>
  <viking-button-wc variant="subtle">Subtle</viking-button-wc>
</div>
<div class="viking-demo-row">
  <button type="button" class="viking-btn viking-btn-primary viking-btn-compact">Compact</button>
  <button type="button" class="viking-btn viking-btn-outline viking-btn-compact">Cancel</button>
</div>`,
        snippets: btnSnippets(),
        tags: ['web-component', 'css'],
        selector: 'viking-button',
        wcSelector: 'viking-button-wc',
        api: getComponentApi('button'),
        related: ['field-stack', 'icon'],
      },
      {
        id: 'badge',
        name: 'Badge',
        description: 'Status pills with tone variants — never color alone.',
        preview: `<div class="viking-demo-row">
  <viking-badge-wc>Default</viking-badge-wc>
  <viking-badge-wc tone="accent">Active</viking-badge-wc>
  <viking-badge-wc tone="success">Healthy</viking-badge-wc>
  <viking-badge-wc tone="warning">Degraded</viking-badge-wc>
  <viking-badge-wc tone="danger">Critical</viking-badge-wc>
</div>`,
        snippets: {
          angular: `<viking-badge>Default</viking-badge>
<viking-badge tone="accent">Active</viking-badge>
<viking-badge tone="success" icon="check">Healthy</viking-badge>`,
          astro: `<viking-badge-wc tone="accent">Active</viking-badge-wc>
<viking-badge-wc tone="success">Healthy</viking-badge-wc>`,
          django: `<span class="viking-badge viking-badge-success">Healthy</span>`,
          javascript: `<viking-badge-wc tone="success">Healthy</viking-badge-wc>`,
        },
        selector: 'viking-badge',
        wcSelector: 'viking-badge-wc',
        api: getComponentApi('badge'),
      },
      {
        id: 'typography',
        name: 'Typography',
        description: 'Heading, text, and label primitives with tokenized rhythm.',
        preview: `<h2 class="viking-heading">Operational intelligence</h2>
<p class="viking-text">Precision-engineered telemetry for contested ML infrastructure.</p>
<p class="viking-text-muted">Sub-50ms ClickHouse rollups · symmetrical tenant isolation</p>
<span class="viking-label">Section label</span>`,
        snippets: {
          angular: `<viking-heading size="lg" [level]="2">Operational intelligence</viking-heading>
<viking-text variant="muted">Sub-50ms ClickHouse rollups</viking-text>
<viking-label>Mission ID</viking-label>`,
          astro: `<h2 class="viking-heading">Operational intelligence</h2>
<p class="viking-text-muted">Sub-50ms ClickHouse rollups</p>`,
          django: `<h2 class="viking-heading">{{ title }}</h2>
<p class="viking-text-muted">{{ subtitle }}</p>`,
          javascript: `document.querySelector('.viking-heading')!.textContent = 'Operational intelligence';`,
        },
      },
      {
        id: 'card',
        name: 'Card',
        description: 'Machined surface panels with inset hairline highlights.',
        preview: `<viking-card-wc>
  <div class="viking-card-header">
    <h3 class="viking-heading viking-heading-sm">Event throughput</h3>
  </div>
  <p class="viking-text-muted">8.2K events/sec across symmetrical tenant pipelines.</p>
</viking-card-wc>
<viking-card-wc compact>
  <span class="viking-label">Compact metric</span>
  <strong class="viking-metric">99.97%</strong>
</viking-card-wc>`,
        snippets: {
          angular: `<viking-card>
  <viking-card-header>
    <viking-heading size="lg" [level]="3">Event throughput</viking-heading>
  </viking-card-header>
  <viking-text variant="muted">8.2K events/sec</viking-text>
</viking-card>`,
          astro: `<viking-card-wc>
  <h3 class="viking-heading viking-heading-sm">Event throughput</h3>
  <p class="viking-text-muted">8.2K events/sec</p>
</viking-card-wc>`,
          django: `<div class="viking-card">
  <h3 class="viking-heading viking-heading-sm">{{ metric.title }}</h3>
  <p class="viking-text-muted">{{ metric.detail }}</p>
</div>`,
          javascript: `<viking-card-wc compact>
  <strong class="viking-metric">99.97%</strong>
</viking-card-wc>`,
        },
        selector: 'viking-card',
        wcSelector: 'viking-card-wc',
        tags: ['web-component', 'css'],
        api: getComponentApi('card'),
        related: ['metric-card'],
      },
      {
        id: 'icon',
        name: 'Icon',
        description: 'Zero-dependency SVG icons from the Viking registry — no font or Lucide runtime.',
        preview: `<div class="viking-demo-row">
  <span class="showcase-icon-demo" aria-hidden="true">◆</span>
  <span class="viking-label">Use viking-icon in Angular for full registry</span>
</div>`,
        snippets: {
          angular: `import { VikingIcon } from '@dataengineeringformachinelearning/viking-ui';

<viking-icon name="rocket" [size]="22" />
<viking-icon name="loader" [spin]="true" color="accent" />`,
          astro: `{/* Import icon paths from library for static SVG, or use Angular island */}`,
          django: `{# Static pages: inline SVG from icon registry or CSS utility #}`,
          javascript: `// Icons ship as inline SVG via viking-icon Angular component`,
        },
        selector: 'viking-icon',
        api: getComponentApi('icon'),
        tags: ['angular'],
      },
    ],
  },
  {
    id: 'forms',
    label: 'Forms & Inputs',
    description: 'Accessible field stacks, controls, and validation patterns.',
    components: [
      {
        id: 'input',
        name: 'Input',
        description: 'Text inputs with clearable state and field composition.',
        preview: `<div class="viking-demo-row viking-demo-row-stack">
  <viking-input-wc placeholder="Mission ID" clearable></viking-input-wc>
  <div class="viking-field">
    <label class="viking-field-label" for="email-demo">Email</label>
    <div class="viking-input-shell">
      <input id="email-demo" class="viking-input-native" type="email" placeholder="you@company.com" />
    </div>
  </div>
</div>`,
        snippets: inputSnippets,
        tags: ['web-component', 'css'],
        selector: 'viking-input',
        wcSelector: 'viking-input-wc',
        api: getComponentApi('input'),
        related: ['field-stack'],
      },
      {
        id: 'field-stack',
        name: 'Field stack',
        description: 'Label, control, description, and error message composition.',
        preview: `<div class="viking-field">
  <label class="viking-field-label" for="tenant-slug">Tenant slug</label>
  <p class="viking-field-description">UUID-based isolation — no sequential IDs.</p>
  <div class="viking-input-shell">
    <input id="tenant-slug" class="viking-input-native" type="text" placeholder="acme-corp" />
  </div>
</div>`,
        snippets: {
          angular: `<viking-field label="Tenant slug" description="UUID-based isolation">
  <viking-input type="text" placeholder="acme-corp" />
</viking-field>`,
          astro: `<div class="viking-field">
  <label class="viking-field-label">Tenant slug</label>
  <viking-input-wc placeholder="acme-corp"></viking-input-wc>
</div>`,
          django: `<div class="viking-field">
  <label class="viking-field-label" for="tenant-slug">Tenant slug</label>
  <div class="viking-input-shell">
    <input id="tenant-slug" class="viking-input-native" type="text" />
  </div>
</div>`,
          javascript: `<div class="viking-field">
  <label class="viking-field-label">Tenant slug</label>
  <viking-input-wc placeholder="acme-corp"></viking-input-wc>
</div>`,
        },
        selector: 'viking-field',
        api: getComponentApi('field-stack'),
        related: ['input', 'checkbox', 'select'],
      },
      {
        id: 'checkbox',
        name: 'Checkbox',
        description: 'Binary selection with keyboard and screen reader support.',
        preview: `<label class="viking-checkbox-label">
  <input type="checkbox" checked />
  <span>Enable threat scoring at ingress</span>
</label>
<label class="viking-checkbox-label">
  <input type="checkbox" />
  <span>Symmetrical multi-tenant pipeline</span>
</label>`,
        snippets: {
          angular: `<viking-checkbox [(checked)]="threatScoring">Enable threat scoring</viking-checkbox>`,
          astro: `<label class="viking-checkbox-label"><input type="checkbox" /><span>Enable threat scoring</span></label>`,
          django: `<label class="viking-checkbox-label"><input type="checkbox" name="threat" /><span>Enable threat scoring</span></label>`,
          javascript: `document.querySelector('viking-checkbox')?.setAttribute('checked', '');`,
        },
      },
      {
        id: 'select',
        name: 'Select',
        description: 'Native and custom select patterns for retention and filters.',
        preview: `<viking-select-wc label="Retention window">
  <option value="">Select retention</option>
  <option value="7d">7 days</option>
  <option value="30d" selected>30 days</option>
  <option value="90d">90 days</option>
</viking-select-wc>`,
        snippets: {
          angular: `<viking-native-select
  label="Retention window"
  [options]="retentionOptions"
/>`,
          astro: `<viking-select-wc label="Retention window"><option>30 days</option></viking-select-wc>`,
          django: `<select class="viking-select-native" name="retention">{% for o in options %}<option>{{ o.label }}</option>{% endfor %}</select>`,
          javascript: `<viking-select-wc label="Retention"><option value="30d">30 days</option></viking-select-wc>`,
        },
        selector: 'viking-native-select',
        wcSelector: 'viking-select-wc',
        tags: ['web-component', 'css'],
        api: getComponentApi('select'),
      },
    ],
  },
  {
    id: 'feedback',
    label: 'Feedback & Overlays',
    description: 'Callouts, progress, skeletons, and overlay patterns.',
    components: [
      {
        id: 'callout',
        name: 'Callout',
        description: 'Contextual alerts with icon + label — not color alone.',
        preview: `<viking-callout-wc tone="info" heading="Event projections">
  Commands commit to the transactional Outbox before Redpanda publish.
</viking-callout-wc>
<viking-callout-wc tone="warning" heading="Degraded worker">
  telemetry_worker lag exceeds 3s on partition 3.
</viking-callout-wc>`,
        snippets: {
          angular: `<viking-callout tone="info" icon="info">Event projections active</viking-callout>
<viking-callout tone="warning" icon="alert-triangle">Worker degraded</viking-callout>`,
          astro: `<viking-callout-wc tone="info" heading="Event projections">Commands commit to Outbox.</viking-callout-wc>`,
          django: `<div class="viking-callout-static viking-callout-warning">{{ message }}</div>`,
          javascript: `<viking-callout-wc tone="success" heading="Deployed">Outbox relay published.</viking-callout-wc>`,
        },
        selector: 'viking-callout',
        wcSelector: 'viking-callout-wc',
        tags: ['web-component', 'css'],
        api: getComponentApi('callout'),
      },
      {
        id: 'modal',
        name: 'Modal',
        description: 'Accessible dialog with focus trap, Escape dismiss, and tokenized overlay.',
        preview: `<div class="showcase-modal-demo" aria-hidden="true">
  <div class="showcase-modal-backdrop"></div>
  <div class="showcase-modal-panel viking-card">
    <header class="viking-card-header">
      <h3 class="viking-heading viking-heading-sm">Confirm deploy</h3>
    </header>
    <p class="viking-text-muted">Push v2.0.0 to production? Uses the Outbox relay.</p>
    <footer class="viking-demo-row">
      <viking-button-wc variant="primary">Deploy</viking-button-wc>
      <viking-button-wc variant="outline">Cancel</viking-button-wc>
    </footer>
  </div>
</div>
<p class="viking-text-muted" style="margin-top:var(--viking-space-1);font-size:var(--viking-font-size-xs)">Live: <code>viking-modal-wc</code> with native dialog + focus trap</p>`,
        snippets: {
          angular: `<viking-modal [(open)]="confirmOpen" title="Confirm deploy" size="md">
  <p>Push v2.0.0 to production?</p>
  <viking-button variant="primary" (pressed)="deploy()">Deploy</viking-button>
</viking-modal>`,
          astro: `<viking-modal-wc title="Confirm deploy">
  <p>Push v2.0.0 to production?</p>
  <viking-button-wc slot="actions" variant="primary">Deploy</viking-button-wc>
</viking-modal-wc>`,
          django: `{# Use viking-modal-wc or native dialog with viking-card styling #}`,
          javascript: `document.querySelector('viking-modal-wc')?.setAttribute('open', '');`,
        },
        selector: 'viking-modal',
        wcSelector: 'viking-modal-wc',
        api: getComponentApi('modal'),
        tags: ['web-component', 'angular'],
      },
      {
        id: 'toast',
        name: 'Toast',
        description: 'Ephemeral feedback via VikingToastService — icon + tone, never color alone.',
        preview: `<div class="showcase-toast-demo viking-card">
  <strong class="viking-heading viking-heading-sm">Deployment queued</strong>
  <p class="viking-text-muted">Outbox relay will publish within 200ms.</p>
</div>`,
        snippets: {
          angular: `import { VikingToastService } from '@dataengineeringformachinelearning/viking-ui';

constructor(private readonly toast: VikingToastService) {}

this.toast.show({ message: 'Deployment queued', tone: 'success' });`,
          astro: `{/* Toasts are Angular service-driven — use viking-callout for static feedback */}`,
          django: `<div class="viking-callout-static viking-callout-success">{{ message }}</div>`,
          javascript: `// Use VikingToastService in Angular apps`,
        },
        selector: 'viking-toaster',
        api: getComponentApi('toast'),
        tags: ['angular', 'service'],
      },
      {
        id: 'progress',
        name: 'Progress',
        description: 'Determinate and indeterminate loading indicators.',
        preview: `<div class="viking-progress" role="progressbar" aria-valuenow="72" aria-valuemin="0" aria-valuemax="100">
  <div class="viking-progress-bar" style="width: 72%"></div>
</div>
<div class="viking-progress viking-progress-indeterminate" role="progressbar" aria-label="Loading"></div>`,
        snippets: {
          angular: `<viking-progress [value]="72" />`,
          astro: `<div class="viking-progress" role="progressbar" aria-valuenow="72"><div class="viking-progress-bar" style="width:72%"></div></div>`,
          django: `<div class="viking-progress"><div class="viking-progress-bar" style="width:{{ pct }}%"></div></div>`,
          javascript: `bar.style.width = \`\${value}%\`;`,
        },
      },
      {
        id: 'skeleton',
        name: 'Skeleton',
        description: 'Placeholder loaders respecting reduced-motion preferences.',
        preview: `<div class="viking-skeleton-row">
  <div class="viking-skeleton viking-skeleton-circle"></div>
  <div class="viking-skeleton-lines">
    <div class="viking-skeleton viking-skeleton-line"></div>
    <div class="viking-skeleton viking-skeleton-line viking-skeleton-line-short"></div>
  </div>
</div>`,
        snippets: {
          angular: `<viking-skeleton variant="circle" />
<viking-skeleton variant="text" [lines]="2" />`,
          astro: `<div class="viking-skeleton viking-skeleton-line"></div>`,
          django: `<div class="viking-skeleton viking-skeleton-line"></div>`,
          javascript: `skeleton.className = 'viking-skeleton viking-skeleton-line';`,
        },
      },
    ],
  },
  {
    id: 'data',
    label: 'Data Visualization',
    description: 'Native SVG charts, metrics, and operational dashboards.',
    components: [
      {
        id: 'metric-card',
        name: 'Metric card',
        description: 'KPI surfaces with machined borders and sparkline slots.',
        preview: `<div class="viking-metric-card">
  <span class="viking-label">P99 latency</span>
  <strong class="viking-metric">42ms</strong>
  <span class="viking-badge viking-badge-success">↓ 12%</span>
</div>
<div class="viking-metric-card">
  <span class="viking-label">Events/sec</span>
  <strong class="viking-metric">8.2K</strong>
</div>`,
        snippets: {
          angular: `<viking-metric-card label="P99 latency" value="42ms" trend="down" />`,
          astro: `<div class="viking-metric-card"><span class="viking-label">P99 latency</span><strong class="viking-metric">42ms</strong></div>`,
          django: `<div class="viking-metric-card"><span class="viking-label">{{ label }}</span><strong class="viking-metric">{{ value }}</strong></div>`,
          javascript: `card.innerHTML = '<strong class="viking-metric">42ms</strong>';`,
        },
      },
      {
        id: 'chart',
        name: 'Chart',
        description: 'Zero-dependency native SVG — line, area, bar, donut, sparkline.',
        preview: `<div class="showcase-chart-demo" aria-label="Sample line chart">
  <svg viewBox="0 0 320 120" role="img" aria-label="Telemetry trend">
    <polyline class="showcase-chart-line" points="0,90 40,70 80,75 120,45 160,50 200,30 240,35 280,20 320,25" />
    <polyline class="showcase-chart-area" points="0,120 0,90 40,70 80,75 120,45 160,50 200,30 240,35 280,20 320,25 320,120" />
  </svg>
</div>`,
        snippets: {
          angular: `<viking-chart kind="line" [data]="series" tone="primary" />`,
          astro: `{/* Use viking-chart via Angular island or static SVG demo */}`,
          django: `{# Charts render server-side; use viking-chart in Angular app #}`,
          javascript: `// Full chart API available via Angular viking-chart component`,
        },
        selector: 'viking-chart',
        api: getComponentApi('chart'),
        related: ['metric-card', 'chart-panel'],
      },
      {
        id: 'table',
        name: 'Table',
        description: 'Scrollable data tables with semantic thead/tbody structure.',
        preview: `<div class="viking-table-wrap">
  <table class="viking-table">
    <thead><tr><th scope="col">Worker</th><th scope="col">Status</th><th scope="col">Lag</th></tr></thead>
    <tbody>
      <tr><td>telemetry_worker</td><td><span class="viking-badge viking-badge-success">Healthy</span></td><td>0.4s</td></tr>
      <tr><td>outbox_relay</td><td><span class="viking-badge viking-badge-success">Healthy</span></td><td>0.1s</td></tr>
      <tr><td>threat_scanner</td><td><span class="viking-badge viking-badge-warning">Degraded</span></td><td>3.2s</td></tr>
    </tbody>
  </table>
</div>`,
        snippets: {
          angular: `<viking-table>
  <thead><tr><th scope="col">Worker</th><th scope="col">Status</th></tr></thead>
  <tbody><tr><td>telemetry_worker</td><td>Healthy</td></tr></tbody>
</viking-table>`,
          astro: `<table class="viking-table">...</table>`,
          django: `<table class="viking-table">{% for row in rows %}<tr>...</tr>{% endfor %}</table>`,
          javascript: `table.className = 'viking-table';`,
        },
      },
    ],
  },
  {
    id: 'shell',
    label: 'Application Shell',
    description: 'Navigation, page headers, and workspace layout primitives.',
    components: [
      {
        id: 'page-header',
        name: 'Page header',
        description: 'HUD-style page titles with actions and breadcrumbs slot.',
        preview: `<header class="viking-page-header-static">
  <p class="viking-label">Component library</p>
  <h1 class="viking-heading viking-heading-xl">Viking-UI</h1>
  <p class="viking-text-muted">Precision-engineered primitives for operational ML platforms.</p>
  <div class="viking-demo-row">
    <viking-button-wc variant="primary">Get started</viking-button-wc>
    <viking-button-wc variant="secondary">View tokens</viking-button-wc>
  </div>
</header>`,
        snippets: {
          angular: `<viking-page-header title="Viking-UI" subtitle="Precision primitives" layout="hud">
  <viking-button vikingPageHeaderActions variant="primary">Get started</viking-button>
</viking-page-header>`,
          astro: `<header class="viking-page-header-static"><h1 class="viking-heading viking-heading-xl">Viking-UI</h1></header>`,
          django: `<header class="viking-page-header-static"><h1>{{ page_title }}</h1></header>`,
          javascript: `header.className = 'viking-page-header-static';`,
        },
      },
      {
        id: 'tabs',
        name: 'Tabs',
        description: 'Segmented navigation with keyboard roving focus.',
        preview: `<div class="viking-tabs" role="tablist" aria-label="Dashboard sections">
  <button type="button" class="viking-tab viking-tab-active" role="tab" aria-selected="true">Overview</button>
  <button type="button" class="viking-tab" role="tab" aria-selected="false">Metrics</button>
  <button type="button" class="viking-tab" role="tab" aria-selected="false">Audit</button>
</div>`,
        snippets: {
          angular: `<viking-tabs [(value)]="activeTab">
  <viking-tab value="overview">Overview</viking-tab>
  <viking-tab-panel value="overview">...</viking-tab-panel>
</viking-tabs>`,
          astro: `<div class="viking-tabs" role="tablist">...</div>`,
          django: `<div class="viking-tabs" role="tablist">...</div>`,
          javascript: `tab.setAttribute('role', 'tab');`,
        },
      },
      {
        id: 'search-palette',
        name: 'Search palette',
        description:
          'Cross-suite ⌘K command palette — curated navigation to documentation, dashboard, settings, legal, and Viking-UI docs. Web Component for static surfaces; Angular suite wrapper for deml.app.',
        preview: `<div class="showcase-search-palette" role="presentation" aria-label="Search palette preview">
  <div class="showcase-search-palette-header">
    <span class="showcase-search-icon" aria-hidden="true">⌕</span>
    <input type="search" class="showcase-search-input" placeholder="Search documentation, dashboard, settings…" aria-label="Search" readonly />
  </div>
  <div class="showcase-search-palette-body">
    <a class="viking-search-result-static" href="#"><span class="viking-search-result-title">Documentation</span><span class="viking-search-result-snippet">Platform guides and API docs</span></a>
    <a class="viking-search-result-static" href="#"><span class="viking-search-result-title">Dashboard</span><span class="viking-search-result-snippet">Open deml.app dashboard</span></a>
    <a class="viking-search-result-static" href="#"><span class="viking-search-result-title">Privacy Policy</span><span class="viking-search-result-snippet">Legal &amp; compliance</span></a>
  </div>
  <footer class="showcase-search-palette-footer">
    <span class="viking-kbd-static">⌘K</span> toggle · <span class="viking-kbd-static">↑↓</span> navigate · <span class="viking-kbd-static">Enter</span> open · <span class="viking-kbd-static">Esc</span> close
  </footer>
</div>
<p class="viking-text-muted" style="margin-top:var(--viking-space-1);font-size:var(--viking-font-size-xs)">Live: try <strong>⌘K</strong> in the docs header — powered by <code>viking-search-palette-wc</code></p>`,
        snippets: {
          angular: `<viking-suite-search-palette
  context="app"
  [urls]="siteUrls"
  placeholder="Search documentation, dashboard, settings…"
/>`,
          astro: `<script type="module" src="/assets/viking-ui-elements.js"></script>
<viking-search-palette-wc
  global-shortcut
  placeholder="Search documentation, dashboard, settings…"
  items='[{"title":"Documentation","href":"/documentation","group":"Resources"}]'
></viking-search-palette-wc>
<script src="/assets/widgets/command-palette.js" defer></script>`,
          django: `{# Navbar triggers DemlWidgets.openSearch(); see widgets/command-palette.js #}`,
          javascript: `import { buildSuiteSearchItems } from '@dataengineeringformachinelearning/viking-ui';

const items = buildSuiteSearchItems('marketing', siteUrls);
document.querySelector('viking-search-palette-wc')?.setAttribute('items', JSON.stringify(items));
document.querySelector('viking-search-palette-wc')?.openPalette();`,
        },
        tags: ['shell', 'web-component', 'keyboard'],
        selector: 'viking-search-palette',
        wcSelector: 'viking-search-palette-wc',
        related: ['command', 'modal'],
        api: getComponentApi('search-palette'),
      },
      {
        id: 'command',
        name: 'Command',
        description:
          'Keyboard-driven command list for in-app actions. Pair with search palette for navigation or use standalone for power-user workflows.',
        preview: `<div class="showcase-search-palette" role="presentation" aria-label="Command palette preview">
  <div class="showcase-search-palette-header">
    <span class="showcase-search-icon" aria-hidden="true">⌕</span>
    <input type="search" class="showcase-search-input" placeholder="Type a command or search…" aria-label="Commands" readonly />
  </div>
  <div class="showcase-search-palette-body">
    <p class="viking-label" style="margin:0 0 var(--viking-space-half)">Actions</p>
    <button type="button" class="viking-search-result-static" style="width:100%;text-align:left;border:none;background:transparent;cursor:default">
      <span class="viking-search-result-title">Trigger SLA model training</span>
    </button>
    <button type="button" class="viking-search-result-static" style="width:100%;text-align:left;border:none;background:transparent;cursor:default">
      <span class="viking-search-result-title">Rotate encryption keys</span>
      <span class="viking-kbd-static" style="margin-left:auto">R</span>
    </button>
  </div>
  <footer class="showcase-search-palette-footer">
    <span class="viking-kbd-static">Esc</span> close
  </footer>
</div>`,
        snippets: {
          angular: `<viking-command
  [items]="commandItems"
  [(open)]="commandOpen"
  (executed)="runCommand($event)"
/>`,
          astro: `{# Use viking-search-palette-wc for static navigation; viking-command is Angular-only #}`,
          django: `{# Command actions are Angular-only — use search palette widget for links #}`,
          javascript: `// viking-command is Angular-only; use viking-search-palette-wc on static pages`,
        },
        tags: ['angular', 'keyboard'],
        selector: 'viking-command',
        related: ['search-palette'],
        api: getComponentApi('command'),
      },
      {
        id: 'form-section',
        name: 'Form section',
        description: 'Grouped settings sections with title rhythm for billing and configuration pages.',
        preview: `<section class="viking-form-section">
  <h2 class="viking-heading viking-heading-sm">Billing</h2>
  <p class="viking-text-muted">Manage subscription and payment methods.</p>
  <div class="viking-field">
    <label class="viking-field-label" for="plan">Plan</label>
    <select id="plan" class="viking-select-native"><option>Pro</option></select>
  </div>
</section>`,
        snippets: {
          angular: `<viking-form-section title="Billing" description="Manage subscription">
  <viking-field label="Plan">
    <viking-native-select [options]="plans" />
  </viking-field>
</viking-form-section>`,
          astro: `<section class="viking-form-section">...</section>`,
          django: `<section class="viking-form-section"><h2>{{ section.title }}</h2>...</section>`,
          javascript: `section.className = 'viking-form-section';`,
        },
        selector: 'viking-form-section',
        related: ['field-stack'],
      },
      {
        id: 'theme-toggle',
        name: 'Theme toggle',
        description: 'Light/dark mode switch respecting prefers-color-scheme and localStorage.',
        preview: `<viking-theme-toggle-wc aria-label="Toggle theme"></viking-theme-toggle-wc>
<button type="button" class="theme-toggle-btn" aria-label="Toggle theme (CSS class)"></button>`,
        snippets: {
          angular: `<viking-theme-toggle />`,
          astro: `<viking-theme-toggle-wc aria-label="Toggle theme"></viking-theme-toggle-wc>`,
          django: `<viking-theme-toggle-wc aria-label="Toggle theme"></viking-theme-toggle-wc>`,
          javascript: `<viking-theme-toggle-wc></viking-theme-toggle-wc>`,
        },
        selector: 'viking-theme-toggle',
        wcSelector: 'viking-theme-toggle-wc',
        tags: ['a11y'],
      },
    ],
  },
  {
    id: 'auth',
    label: 'Authentication',
    description: 'OAuth panels and verification flows.',
    components: [
      {
        id: 'auth-panel',
        name: 'Auth panel',
        description: 'Firebase OAuth shell with social providers and email fallback.',
        preview: `<div class="showcase-auth-panel">
  <h3 class="viking-heading viking-heading-sm">Sign in to DEML</h3>
  <p class="viking-text-muted">Operational intelligence for your ML infrastructure.</p>
  <div class="viking-demo-row viking-demo-row-stack">
    <button type="button" class="viking-btn viking-btn-outline viking-btn-full">Continue with Google</button>
    <button type="button" class="viking-btn viking-btn-outline viking-btn-full">Continue with GitHub</button>
  </div>
  <div class="viking-divider"><span>or</span></div>
  <viking-input-wc placeholder="Email address" type="email"></viking-input-wc>
  <button type="button" class="viking-btn viking-btn-primary viking-btn-full">Continue</button>
</div>`,
        snippets: {
          angular: `<viking-auth-panel
  [providers]="['google', 'github']"
  (socialLogin)="onSocial($event)"
/>`,
          astro: `{/* Auth panel requires Angular runtime — use viking-auth-panel in deml.app */}`,
          django: `{# OAuth handled via Firebase — embed auth widget in Angular shell #}`,
          javascript: `// Auth panel is Angular-only; use Firebase Auth directly in static sites`,
        },
      },
    ],
  },
  ...EXTENDED_SHOWCASE_CATEGORIES,
  ...PARITY_SHOWCASE_CATEGORIES,
  ...FULL_SHOWCASE_CATEGORIES,
];

export const ALL_COMPONENTS = SHOWCASE_CATEGORIES.flatMap((c) => c.components);

export const COMPONENT_COUNT = ALL_COMPONENTS.length;

/** Search palette entries for every documented component demo. */
export const COMPONENT_SEARCH_ITEMS = ALL_COMPONENTS.map((component) => ({
  title: component.name,
  href: `/components/${component.id}`,
  snippet: component.description,
}));

export const findComponent = (id: string): ShowcaseComponent | undefined =>
  ALL_COMPONENTS.find((c) => c.id === id);

export const findCategoryForComponent = (id: string): ShowcaseCategory | undefined =>
  SHOWCASE_CATEGORIES.find((category) => category.components.some((component) => component.id === id));
