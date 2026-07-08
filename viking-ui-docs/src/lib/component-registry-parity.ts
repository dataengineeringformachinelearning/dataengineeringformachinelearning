import type { ShowcaseCategory } from "./component-registry";
import { getComponentApi } from "./component-api";
import {
  defineShowcaseComponent as entry,
  defineSnippets as snippets,
} from "./component-registry-kit";

/** ~40 additional primitives toward full manifest parity. */
export const PARITY_SHOWCASE_CATEGORIES: ShowcaseCategory[] = [
  {
    id: "layout-shell",
    label: "Layout & Shell",
    description: "Application chrome, HUD panels, and workspace scaffolding.",
    components: [
      entry(
        {
          id: "app-header",
          name: "App header",
          description:
            "Top navigation bar with brand, actions, and search slot.",
          preview: `<header class="viking-page-header-static">
  <p class="viking-label">Tenant0 · Operations</p>
  <h2 class="viking-heading viking-heading-sm">Mission control</h2>
  <div class="viking-demo-row">
    <viking-badge-wc tone="success">Healthy</viking-badge-wc>
    <viking-button-wc variant="outline" size="sm">Settings</viking-button-wc>
  </div>
</header>`,
          selector: "viking-app-header",
          tags: ["angular", "shell"],
        },
        snippets(
          `<viking-app-header title="Mission control" [showSearch]="true" />`,
          `{/* Use viking-app-header in Angular deml.app shell */}`,
          `{# App header rendered via Angular SSR shell #}`,
          `// viking-app-header is Angular-only`,
        ),
      ),
      entry(
        {
          id: "app-sidebar",
          name: "App sidebar",
          description:
            "Collapsible workspace navigation with icon + label items.",
          preview: `<nav class="viking-card viking-card-compact viking-demo-card-sm" aria-label="Sidebar demo">
  <span class="viking-label">Workspace</span>
  <div class="viking-demo-row viking-demo-full viking-demo-row-stack">
    <span class="viking-text">Overview</span>
    <span class="viking-text-muted">Metrics</span>
    <span class="viking-text-muted">Security</span>
  </div>
</nav>`,
          selector: "viking-app-sidebar",
          tags: ["angular", "shell"],
        },
        snippets(
          `<viking-app-sidebar [items]="navItems" [(collapsed)]="sidebarCollapsed" />`,
          `{/* Sidebar requires Angular runtime */}`,
          `{# Sidebar in deml.app Angular shell #}`,
          `// viking-app-sidebar is Angular-only`,
        ),
      ),
      entry(
        {
          id: "hud-panel",
          name: "HUD panel",
          description:
            "Machined operational panel with inset hairline for telemetry HUDs.",
          preview: `<div class="viking-hud-panel">
  <span class="viking-label">Live telemetry</span>
  <strong class="viking-metric">8.2K/s</strong>
  <p class="viking-text-muted">Symmetrical tenant pipeline throughput.</p>
</div>`,
          selector: "viking-hud-panel",
        },
        snippets(
          `<viking-hud-panel label="Live telemetry" value="8.2K/s" />`,
          `<div class="viking-hud-panel"><span class="viking-label">Live telemetry</span><strong class="viking-metric">8.2K/s</strong></div>`,
          `<div class="viking-hud-panel"><span class="viking-label">{{ label }}</span><strong class="viking-metric">{{ value }}</strong></div>`,
          `panel.className = 'viking-hud-panel';`,
        ),
      ),
      entry(
        {
          id: "footer",
          name: "Footer",
          description: "Application footer with links and compliance slots.",
          preview: `<footer class="viking-card viking-card-compact">
  <span class="viking-label">DEML Platform</span>
  <p class="viking-text-muted">© 2026 Data Engineering for AI Engineering and Cybersecurity</p>
</footer>`,
          selector: "viking-footer",
        },
        snippets(
          `<viking-footer [links]="footerLinks" />`,
          `<footer class="viking-card viking-card-compact"><p class="viking-text-muted">© 2026 DEML</p></footer>`,
          `<footer class="viking-card viking-card-compact">{% include "partials/footer.html" %}</footer>`,
          `footer.className = 'viking-card viking-card-compact';`,
        ),
      ),
      entry(
        {
          id: "site-navbar",
          name: "Site navbar",
          description:
            "Marketing-grade navbar with search, theme toggle, and CTA slots.",
          preview: `<div class="viking-card viking-card-compact">
  <div class="viking-demo-row">
    <strong class="viking-heading viking-heading-sm">DEML</strong>
    <viking-button-wc variant="ghost" size="sm">Docs</viking-button-wc>
    <viking-button-wc variant="primary" size="sm">Launch</viking-button-wc>
  </div>
</div>`,
          selector: "viking-site-navbar",
          tags: ["angular", "marketing"],
        },
        snippets(
          `import { VikingSiteNavbar } from '@dataengineeringformachinelearning/viking-ui';

<viking-site-navbar [urls]="siteUrls" />`,
          `{/* Marketing uses static navbar + algolia-search.js widget */}`,
          `{# partials/site_navbar.html with viking-ui.css #}`,
          `// See marketing/public/assets/widgets/algolia-search.js`,
        ),
      ),
    ],
  },
  {
    id: "display",
    label: "Display & Content",
    description: "Avatars, empty states, spinners, and typographic helpers.",
    components: [
      entry(
        {
          id: "avatar",
          name: "Avatar",
          description: "User or tenant identity circle with initials fallback.",
          preview: `<div class="viking-demo-row">
  <span class="viking-avatar-static" aria-hidden="true">CT</span>
  <span class="viking-avatar-static viking-avatar-accent" aria-hidden="true">D0</span>
</div>`,
          selector: "viking-avatar",
        },
        snippets(
          `<viking-avatar initials="CT" [size]="40" />`,
          `<span class="viking-avatar-static">CT</span>`,
          `<span class="viking-avatar-static">{{ user.initials }}</span>`,
          `avatar.textContent = 'CT'; avatar.className = 'viking-avatar-static';`,
        ),
      ),
      entry(
        {
          id: "empty-state",
          name: "Empty state",
          description:
            "Centered placeholder when lists or charts have no data.",
          preview: `<div class="viking-empty-state-static">
  <p class="viking-heading viking-heading-sm">No incidents</p>
  <p class="viking-text-muted">Threat scoring has not flagged any events in this window.</p>
  <viking-button-wc variant="outline">Refresh</viking-button-wc>
</div>`,
          selector: "viking-empty-state",
        },
        snippets(
          `<viking-empty-state heading="No incidents" description="Threat scoring clear">
  <viking-button variant="outline">Refresh</viking-button>
</viking-empty-state>`,
          `<div class="viking-empty-state-static"><p class="viking-heading viking-heading-sm">No incidents</p></div>`,
          `<div class="viking-empty-state-static"><p>{{ empty.title }}</p></div>`,
          `state.className = 'viking-empty-state-static';`,
        ),
      ),
      entry(
        {
          id: "spinner",
          name: "Spinner",
          description:
            "Indeterminate loading indicator with reduced-motion respect.",
          preview: `<div class="viking-demo-row">
  <span class="viking-spinner-static" role="status" aria-label="Loading"></span>
  <span class="viking-text-muted">Relaying Outbox events…</span>
</div>`,
          selector: "viking-spinner",
        },
        snippets(
          `<viking-spinner [size]="24" aria-label="Loading" />`,
          `<span class="viking-spinner-static" role="status" aria-label="Loading"></span>`,
          `<span class="viking-spinner-static" role="status" aria-label="Loading"></span>`,
          `spinner.className = 'viking-spinner-static';`,
        ),
      ),
      entry(
        {
          id: "loading-overlay",
          name: "Loading overlay",
          description:
            "Full-surface blocking loader for async route transitions.",
          preview: `<div class="viking-loading-overlay-demo viking-card">
  <span class="viking-spinner-static" role="status" aria-label="Loading dashboard"></span>
  <p class="viking-text-muted">Materializing Firestore projections…</p>
</div>`,
          selector: "viking-loading-overlay",
          tags: ["angular"],
        },
        snippets(
          `<viking-loading-overlay [active]="loading()" message="Loading dashboard" />`,
          `{/* Use viking-skeleton for static Astro pages */}`,
          `{# Django: skeleton placeholders during HTMX swaps #}`,
          `// viking-loading-overlay is Angular-only`,
        ),
      ),
      entry(
        {
          id: "separator",
          name: "Separator",
          description:
            "Visual divider between sections — horizontal or vertical.",
          preview: `<div class="viking-demo-full viking-demo-row-stack">
  <span class="viking-text">Billing</span>
  <hr class="viking-separator-static" />
  <span class="viking-text-muted">Payment methods</span>
</div>`,
          selector: "viking-separator",
        },
        snippets(
          `<viking-separator />`,
          `<hr class="viking-separator-static" />`,
          `<hr class="viking-separator-static" />`,
          `hr.className = 'viking-separator-static';`,
        ),
      ),
      entry(
        {
          id: "kbd",
          name: "Keyboard hint",
          description:
            "Styled kbd element for shortcuts — pairs with search palette footer.",
          preview: `<span class="viking-kbd-static">⌘</span><span class="viking-kbd-static">K</span>
<span class="viking-text-muted">Open command palette</span>`,
          selector: "viking-kbd",
        },
        snippets(
          `<viking-kbd>⌘</viking-kbd><viking-kbd>K</viking-kbd>`,
          `<span class="viking-kbd-static">⌘</span><span class="viking-kbd-static">K</span>`,
          `<kbd class="viking-kbd-static">Esc</kbd>`,
          `kbd.className = 'viking-kbd-static'; kbd.textContent = 'K';`,
        ),
      ),
      entry(
        {
          id: "label",
          name: "Label",
          description: "Caps-style field and section labels with token rhythm.",
          preview: `<span class="viking-label">Retention policy</span>
<span class="viking-label">Threat scoring</span>`,
          selector: "viking-label",
        },
        snippets(
          `<viking-label>Retention policy</viking-label>`,
          `<span class="viking-label">Retention policy</span>`,
          `<span class="viking-label">{{ field.label }}</span>`,
          `label.className = 'viking-label';`,
        ),
      ),
      entry(
        {
          id: "icon-badge",
          name: "Icon badge",
          description:
            "Circular icon container for settings headers and metric rows.",
          preview: `<div class="viking-demo-row">
  <span class="viking-icon-badge-static" aria-hidden="true">◆</span>
  <div>
    <span class="viking-label">Security</span>
    <p class="viking-text-muted">RBAC and ABAC policies</p>
  </div>
</div>`,
          selector: "viking-icon-badge",
          tags: ["angular"],
        },
        snippets(
          `<viking-icon-badge icon="shield" tone="accent" />`,
          `<span class="viking-icon-badge-static" aria-hidden="true">◆</span>`,
          `<span class="viking-icon-badge-static">{{ icon }}</span>`,
          `// viking-icon-badge uses Viking icon registry in Angular`,
        ),
      ),
      entry(
        {
          id: "brand",
          name: "Brand mark",
          description: "Logo lockup with wordmark for navbars and auth panels.",
          preview: `<div class="viking-demo-row">
  <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 18 L12 4 L20 18 Z"/></svg>
  <strong class="viking-heading viking-heading-sm">DEML</strong>
</div>`,
          selector: "viking-brand",
        },
        snippets(
          `<viking-brand href="/" />`,
          `<a href="/" class="viking-brand-static"><strong>DEML</strong></a>`,
          `<a href="/" class="viking-brand-static">{{ brand.name }}</a>`,
          `// Static brand mark via SVG + viking-heading`,
        ),
      ),
    ],
  },
  {
    id: "forms-extended",
    label: "Extended Forms",
    description:
      "Text areas, radios, sliders, pickers, and verification inputs.",
    components: [
      entry(
        {
          id: "textarea",
          name: "Textarea",
          description:
            "Multi-line input with field composition and validation.",
          preview: `<div class="viking-field">
  <label class="viking-field-label" for="notes">Runbook notes</label>
  <textarea id="notes" class="viking-textarea-static" rows="3" placeholder="Document rollback steps…"></textarea>
</div>`,
          selector: "viking-textarea",
          related: ["field-stack"],
        },
        snippets(
          `<viking-field label="Runbook notes"><viking-textarea rows="3" placeholder="Document rollback steps…" /></viking-field>`,
          `<textarea class="viking-textarea-static" rows="3" placeholder="Notes…"></textarea>`,
          `<textarea class="viking-textarea-static" name="notes">{{ form.notes }}</textarea>`,
          `textarea.className = 'viking-textarea-static';`,
        ),
      ),
      entry(
        {
          id: "radio",
          name: "Radio group",
          description: "Single selection from mutually exclusive options.",
          preview: `<fieldset class="viking-radio-static">
  <legend class="viking-label">Deployment target</legend>
  <label><input type="radio" name="target" checked /> Production</label>
  <label><input type="radio" name="target" /> Staging</label>
</fieldset>`,
          selector: "viking-radio-group",
        },
        snippets(
          `<viking-radio-group [(value)]="target" [options]="targets" />`,
          `<fieldset class="viking-radio-static"><legend class="viking-label">Target</legend>...</fieldset>`,
          `<fieldset class="viking-radio-static">{% for o in options %}<label><input type="radio" name="target" /></label>{% endfor %}</fieldset>`,
          `// viking-radio-group in Angular apps`,
        ),
      ),
      entry(
        {
          id: "slider",
          name: "Slider",
          description:
            "Range input for retention windows and alert thresholds.",
          preview: `<div class="viking-field">
  <label class="viking-field-label" for="threshold">Alert threshold</label>
  <input id="threshold" class="viking-slider-static" type="range" min="0" max="100" value="72" />
  <span class="viking-text-muted">72% CPU utilization</span>
</div>`,
          selector: "viking-slider",
        },
        snippets(
          `<viking-slider [(value)]="threshold" [min]="0" [max]="100" />`,
          `<input type="range" class="viking-slider-static" min="0" max="100" value="72" />`,
          `<input type="range" class="viking-slider-static" name="threshold" value="{{ threshold }}" />`,
          `slider.type = 'range'; slider.className = 'viking-slider-static';`,
        ),
      ),
      entry(
        {
          id: "native-select",
          name: "Native select",
          description: "Accessible native dropdown with Viking field styling.",
          preview: `<viking-select-wc label="Retention window">
  <option value="7d">7 days</option>
  <option value="30d" selected>30 days</option>
  <option value="90d">90 days</option>
</viking-select-wc>`,
          selector: "viking-native-select",
          wcSelector: "viking-select-wc",
          tags: ["web-component"],
        },
        snippets(
          `<viking-native-select label="Retention window" [options]="retentionOptions" />`,
          `<viking-select-wc label="Retention"><option>30 days</option></viking-select-wc>`,
          `<select class="viking-select-native" name="retention"><option>30 days</option></select>`,
          `<viking-select-wc label="Retention"><option value="30d">30 days</option></viking-select-wc>`,
        ),
      ),
      entry(
        {
          id: "autocomplete",
          name: "Autocomplete",
          description:
            "Typeahead combobox with keyboard navigation and clear button.",
          preview: `<div class="viking-field">
  <label class="viking-field-label" for="tenant">Tenant</label>
  <div class="viking-input-shell">
    <input id="tenant" class="viking-input-native" type="text" placeholder="Search tenants…" autocomplete="off" />
  </div>
</div>`,
          selector: "viking-autocomplete",
          tags: ["angular"],
        },
        snippets(
          `<viking-autocomplete [(value)]="tenant" [options]="tenantOptions" placeholder="Search tenants…" />`,
          `{/* Autocomplete requires Angular — use viking-input-wc for static */}`,
          `{# Combobox via viking-autocomplete in Angular shell #}`,
          `// viking-autocomplete is Angular-only`,
        ),
      ),
      entry(
        {
          id: "date-picker",
          name: "Date picker",
          description:
            "Calendar popover for incident time ranges and billing cycles.",
          preview: `<div class="viking-field">
  <label class="viking-field-label" for="incident-date">Incident date</label>
  <div class="viking-input-shell">
    <input id="incident-date" class="viking-input-native" type="date" />
  </div>
</div>`,
          selector: "viking-date-picker",
          tags: ["angular"],
        },
        snippets(
          `<viking-date-picker [(value)]="incidentDate" label="Incident date" />`,
          `<input type="date" class="viking-input-native" />`,
          `<input type="date" class="viking-input-native" name="incident_date" value="{{ date }}" />`,
          `// viking-date-picker in Angular; native date input for static`,
        ),
      ),
      entry(
        {
          id: "time-picker",
          name: "Time picker",
          description: "Time-of-day selection for maintenance windows.",
          preview: `<div class="viking-field">
  <label class="viking-field-label" for="window">Maintenance window</label>
  <div class="viking-input-shell">
    <input id="window" class="viking-input-native" type="time" value="02:00" />
  </div>
</div>`,
          selector: "viking-time-picker",
          tags: ["angular"],
        },
        snippets(
          `<viking-time-picker [(value)]="maintenanceTime" />`,
          `<input type="time" class="viking-input-native" />`,
          `<input type="time" class="viking-input-native" name="window" />`,
          `// viking-time-picker in Angular apps`,
        ),
      ),
      entry(
        {
          id: "otp-input",
          name: "OTP input",
          description: "One-time passcode digit boxes with auto-advance focus.",
          preview: `<div class="viking-otp-static" role="group" aria-label="Verification code">
  <input type="text" inputmode="numeric" maxlength="1" aria-label="Digit 1" />
  <input type="text" inputmode="numeric" maxlength="1" aria-label="Digit 2" />
  <input type="text" inputmode="numeric" maxlength="1" aria-label="Digit 3" />
  <input type="text" inputmode="numeric" maxlength="1" aria-label="Digit 4" />
</div>`,
          selector: "viking-otp-input",
          tags: ["angular"],
        },
        snippets(
          `<viking-otp-input [(value)]="code" [length]="6" />`,
          `<div class="viking-otp-static" role="group" aria-label="Verification code">...</div>`,
          `{# OTP via viking-otp-input in Angular auth flows #}`,
          `// viking-otp-input is Angular-only`,
        ),
      ),
      entry(
        {
          id: "file-upload",
          name: "File upload",
          description:
            "Drag-and-drop file picker with progress and validation.",
          preview: `<div class="viking-file-upload-static viking-card viking-card-compact">
  <p class="viking-text-muted">Drop model state_dict (.pt) or drag here</p>
  <viking-button-wc variant="outline">Browse files</viking-button-wc>
</div>`,
          selector: "viking-file-upload",
          tags: ["angular"],
        },
        snippets(
          `<viking-file-upload accept=".pt" (filesSelected)="onUpload($event)" />`,
          `{/* File upload requires Angular runtime */}`,
          `<input type="file" class="viking-input-native" accept=".pt" />`,
          `// viking-file-upload is Angular-only`,
        ),
      ),
      entry(
        {
          id: "pillbox",
          name: "Pillbox",
          description: "Multi-select tag input for filters and alert routing.",
          preview: `<div class="viking-pillbox-static">
  <span class="viking-badge viking-badge-accent">production</span>
  <span class="viking-badge">staging</span>
  <viking-input-wc placeholder="Add tag…" size="sm"></viking-input-wc>
</div>`,
          selector: "viking-pillbox",
          tags: ["angular"],
        },
        snippets(
          `<viking-pillbox [(tags)]="envTags" placeholder="Add environment…" />`,
          `<div class="viking-pillbox-static"><span class="viking-badge">production</span></div>`,
          `{# Pillbox filters in Angular admin views #}`,
          `// viking-pillbox is Angular-only`,
        ),
      ),
    ],
  },
  {
    id: "data-viz-extended",
    label: "Extended Data Viz",
    description: "Gauges, chart panels, and operational metric rows.",
    components: [
      entry(
        {
          id: "gauge-arc",
          name: "Gauge arc",
          description: "Semi-circular gauge for SLA and capacity utilization.",
          preview: `<div class="viking-gauge-demo" role="img" aria-label="72% capacity">
  <svg viewBox="0 0 120 70" width="120" height="70" aria-hidden="true">
    <path d="M10,60 A50,50 0 0,1 110,60" fill="none" stroke="var(--viking-border)" stroke-width="8"/>
    <path d="M10,60 A50,50 0 0,1 86,22" fill="none" stroke="var(--viking-accent)" stroke-width="8"/>
  </svg>
  <strong class="viking-metric">72%</strong>
</div>`,
          selector: "viking-gauge-arc",
        },
        snippets(
          `<viking-gauge-arc [value]="72" label="Capacity" />`,
          `<div class="viking-gauge-demo" role="img" aria-label="72% capacity">...</div>`,
          `<div class="viking-gauge-demo"><strong class="viking-metric">{{ pct }}%</strong></div>`,
          `// viking-gauge-arc renders native SVG in Angular`,
        ),
      ),
      entry(
        {
          id: "ring-gauge",
          name: "Ring gauge",
          description: "Circular progress ring for model training epochs.",
          preview: `<div class="viking-ring-gauge-demo" role="img" aria-label="Epoch 8 of 12">
  <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
    <circle cx="24" cy="24" r="20" fill="none" stroke="var(--viking-border)" stroke-width="4"/>
    <circle cx="24" cy="24" r="20" fill="none" stroke="var(--viking-accent)" stroke-width="4" stroke-dasharray="125.6" stroke-dashoffset="31.4" transform="rotate(-90 24 24)"/>
  </svg>
  <span class="viking-label">8/12</span>
</div>`,
          selector: "viking-ring-gauge",
        },
        snippets(
          `<viking-ring-gauge [value]="8" [max]="12" label="Epochs" />`,
          `<div class="viking-ring-gauge-demo" role="img" aria-label="Progress">...</div>`,
          `{# Ring gauge in ML training dashboard #}`,
          `// viking-ring-gauge is Angular SVG component`,
        ),
      ),
      entry(
        {
          id: "chart-panel",
          name: "Chart panel",
          description:
            "Card wrapper with header slot for viking-chart telemetry views.",
          preview: `<viking-card-wc>
  <div class="viking-card-header">
    <h3 class="viking-heading viking-heading-sm">P99 latency</h3>
    <viking-badge-wc tone="success">Healthy</viking-badge-wc>
  </div>
  <div class="showcase-chart-demo"><svg viewBox="0 0 320 80" width="100%"><polyline class="showcase-chart-line" points="0,60 80,45 160,50 240,30 320,35" fill="none" stroke="var(--viking-accent)" stroke-width="2"/></svg></div>
</viking-card-wc>`,
          selector: "viking-chart-panel",
          related: ["chart"],
        },
        snippets(
          `<viking-chart-panel title="P99 latency"><viking-chart kind="line" [data]="series" /></viking-chart-panel>`,
          `<div class="viking-card"><h3 class="viking-heading viking-heading-sm">P99 latency</h3></div>`,
          `<div class="viking-card">{{ chart.title }}</div>`,
          `// viking-chart-panel wraps viking-chart in Angular`,
        ),
      ),
      entry(
        {
          id: "chart-empty-state",
          name: "Chart empty state",
          description:
            "Placeholder when chart series has insufficient data points.",
          preview: `<div class="viking-chart-empty-static viking-card viking-card-compact">
  <p class="viking-heading viking-heading-sm">Insufficient data</p>
  <p class="viking-text-muted">Collect at least 24h of telemetry to render trend lines.</p>
</div>`,
          selector: "viking-chart-empty-state",
          related: ["chart", "empty-state"],
        },
        snippets(
          `<viking-chart-empty-state heading="Insufficient data" description="Collect 24h of telemetry" />`,
          `<div class="viking-chart-empty-static viking-card viking-card-compact">...</div>`,
          `<div class="viking-chart-empty-static">{{ message }}</div>`,
          `empty.className = 'viking-chart-empty-static';`,
        ),
      ),
      entry(
        {
          id: "status-metric-row",
          name: "Status metric row",
          description:
            "Horizontal KPI strip with icon, title, subtitle, and value — spans full card width.",
          preview: `<div class="viking-status-metric-row" style="width:100%">
  <div class="stat-info" style="display:flex;align-items:center;gap:var(--viking-space-2)">
    <span data-viking-icon="server" data-viking-icon-size="22" aria-hidden="true"></span>
    <div>
      <span class="viking-label" style="display:block;text-transform:uppercase">Cumulative SLA</span>
      <span class="viking-text-muted" style="display:block;font-size:var(--viking-font-size-3xs)">Based on real telemetry</span>
    </div>
  </div>
  <strong class="viking-metric">99.97%</strong>
</div>`,
          selector: "viking-status-metric-row",
          related: ["status-card", "status-panel", "uptime-history"],
        },
        snippets(
          `<viking-status-metric-row icon="server" title="Cumulative SLA" subtitle="Based on real telemetry" value="99.97%" />`,
          `<div class="viking-status-metric-row"><span class="viking-label">Cumulative SLA</span><strong class="viking-metric">99.97%</strong></div>`,
          `<div class="viking-status-metric-row"><span class="viking-label">{{ row.title }}</span><strong class="viking-metric">{{ row.value }}</strong></div>`,
          `row.className = 'viking-status-metric-row';`,
        ),
      ),
      entry(
        {
          id: "bar",
          name: "Bar",
          description: "Horizontal bar visualization for comparative metrics.",
          preview: `<div class="viking-bar-static">
  <span class="viking-label">Tenant isolation</span>
  <div class="viking-bar-track"><div class="viking-bar-fill viking-bar-value-94"></div></div>
  <span class="viking-text-muted">94%</span>
</div>`,
          selector: "viking-bar",
        },
        snippets(
          `<viking-bar [value]="94" label="Tenant isolation" />`,
          `<div class="viking-bar-static"><div class="viking-bar-track"><div class="viking-bar-fill viking-bar-value-94"></div></div></div>`,
          `<div class="viking-bar-static"><div class="viking-bar-fill"></div></div>`,
          `fill.style.width = '94%';`,
        ),
      ),
    ],
  },
  {
    id: "navigation-extended",
    label: "Extended Navigation",
    description: "Menus, dropdowns, command surfaces, and sidebar patterns.",
    components: [
      entry(
        {
          id: "dropdown",
          name: "Dropdown",
          description:
            "Action menu with keyboard roving focus and escape dismiss.",
          preview: `<div class="viking-dropdown-demo viking-card viking-card-compact">
  <viking-button-wc variant="outline">Actions ▾</viking-button-wc>
  <div class="viking-demo-row viking-demo-full viking-demo-row-stack">
    <span class="viking-text">Deploy</span>
    <span class="viking-text-muted">Rollback</span>
    <span class="viking-text-muted">View logs</span>
  </div>
</div>`,
          selector: "viking-dropdown",
          tags: ["angular"],
        },
        snippets(
          `<viking-dropdown label="Actions"><viking-menu-item>Deploy</viking-menu-item></viking-dropdown>`,
          `{/* Dropdown requires Angular */}`,
          `{# Action menus in Angular admin #}`,
          `// viking-dropdown is Angular-only`,
        ),
      ),
      entry(
        {
          id: "menubar",
          name: "Menubar",
          description:
            "Horizontal application menu bar for dense operator UIs.",
          preview: `<div class="viking-menubar-static" role="menubar" aria-label="Application menu">
  <button type="button" class="viking-tab" role="menuitem">File</button>
  <button type="button" class="viking-tab" role="menuitem">Edit</button>
  <button type="button" class="viking-tab" role="menuitem">View</button>
</div>`,
          selector: "viking-menubar",
          tags: ["angular"],
        },
        snippets(
          `<viking-menubar><viking-menubar-item label="File" /></viking-menubar>`,
          `<div class="viking-menubar-static" role="menubar">...</div>`,
          `{# Menubar in security admin shell #}`,
          `// viking-menubar is Angular-only`,
        ),
      ),
      entry(
        {
          id: "navigation-menu",
          name: "Navigation menu",
          description: "Multi-level nav with active state and icon support.",
          preview: `<nav class="viking-nav-menu-static" aria-label="Settings">
  <a href="#" class="viking-nav-item-static is-active">Profile</a>
  <a href="#" class="viking-nav-item-static">Billing</a>
  <a href="#" class="viking-nav-item-static">Security</a>
</nav>`,
          selector: "viking-navigation-menu",
        },
        snippets(
          `<viking-navigation-menu [items]="settingsNav" />`,
          `<nav class="viking-nav-menu-static"><a class="viking-nav-item-static is-active">Profile</a></nav>`,
          `<nav class="viking-nav-menu-static">{% for item in nav %}<a href="{{ item.url }}">{{ item.label }}</a>{% endfor %}</nav>`,
          `nav.className = 'viking-nav-menu-static';`,
        ),
      ),
      entry(
        {
          id: "sidebar-nav",
          name: "Sidebar nav",
          description: "Vertical nav list for settings and account pages.",
          preview: `<nav class="viking-sidebar-nav-static" aria-label="Account">
  <a href="#" class="viking-sidebar-nav-item is-active">General</a>
  <a href="#" class="viking-sidebar-nav-item">API keys</a>
  <a href="#" class="viking-sidebar-nav-item">Audit log</a>
</nav>`,
          selector: "viking-sidebar-nav",
        },
        snippets(
          `<viking-sidebar-nav [items]="accountNav" />`,
          `<nav class="viking-sidebar-nav-static"><a class="viking-sidebar-nav-item is-active">General</a></nav>`,
          `<nav class="viking-sidebar-nav-static">{% include "account/nav.html" %}</nav>`,
          `nav.className = 'viking-sidebar-nav-static';`,
        ),
      ),
      entry(
        {
          id: "popover",
          name: "Popover",
          description:
            "Anchored floating panel for contextual actions and filters.",
          preview: `<div class="viking-popover-demo">
  <viking-button-wc variant="outline">Filters</viking-button-wc>
  <div class="viking-card viking-card-compact viking-demo-card-md viking-demo-mt-1">
  <span class="viking-label">Retention</span>
  <viking-select-wc label="Window"><option>30 days</option></viking-select-wc>
  </div>
</div>`,
          selector: "viking-popover",
          tags: ["angular"],
        },
        snippets(
          `<viking-popover trigger="Filters"><viking-field label="Retention">...</viking-field></viking-popover>`,
          `{/* Popover requires Angular positioning */}`,
          `{# Popover filters in Angular admin #}`,
          `// viking-popover is Angular-only`,
        ),
      ),
    ],
  },
  {
    id: "content-patterns",
    label: "Content Patterns",
    description: "Accordions, carousels, timelines, and rich editors.",
    components: [
      entry(
        {
          id: "accordion",
          name: "Accordion",
          description: "Expandable sections for FAQ and dense settings pages.",
          preview: `<details class="viking-accordion-static" open>
  <summary class="viking-heading viking-heading-sm">Event projections</summary>
  <p class="viking-text-muted">Commands commit to Outbox before Redpanda publish.</p>
</details>
<details class="viking-accordion-static">
  <summary class="viking-heading viking-heading-sm">Multi-tenancy</summary>
  <p class="viking-text-muted">Symmetrical pipelines iterate Tenant.objects.all().</p>
</details>`,
          selector: "viking-accordion",
        },
        snippets(
          `<viking-accordion><viking-accordion-item title="Event projections">...</viking-accordion-item></viking-accordion>`,
          `<details class="viking-accordion-static"><summary>Event projections</summary><p>...</p></details>`,
          `<details class="viking-accordion-static"><summary>{{ item.title }}</summary><p>{{ item.body }}</p></details>`,
          `details.className = 'viking-accordion-static';`,
        ),
      ),
      entry(
        {
          id: "timeline",
          name: "Timeline",
          description: "Vertical event history for audit logs and deployments.",
          preview: `<ol class="viking-timeline-static">
  <li><span class="viking-label">14:02 UTC</span><p class="viking-text">Outbox relay published v2.0.0</p></li>
  <li><span class="viking-label">14:01 UTC</span><p class="viking-text-muted">Deploy command committed</p></li>
</ol>`,
          selector: "viking-timeline",
        },
        snippets(
          `<viking-timeline><viking-timeline-item time="14:02 UTC">Outbox relay published</viking-timeline-item></viking-timeline>`,
          `<ol class="viking-timeline-static"><li><span class="viking-label">14:02 UTC</span><p>...</p></li></ol>`,
          `<ol class="viking-timeline-static">{% for e in events %}<li>...</li>{% endfor %}</ol>`,
          `list.className = 'viking-timeline-static';`,
        ),
      ),
      entry(
        {
          id: "carousel",
          name: "Carousel",
          description:
            "Horizontal slide deck for marketing highlights and onboarding.",
          preview: `<div class="viking-carousel-static viking-card">
  <p class="viking-heading viking-heading-sm">Slide 1 — Event throughput</p>
  <p class="viking-text-muted">8.2K events/sec across symmetrical pipelines.</p>
  <div class="viking-demo-row"><viking-button-wc variant="ghost" size="sm">←</viking-button-wc><viking-button-wc variant="ghost" size="sm">→</viking-button-wc></div>
</div>`,
          selector: "viking-carousel",
          tags: ["angular"],
        },
        snippets(
          `<viking-carousel><viking-carousel-slide>...</viking-carousel-slide></viking-carousel>`,
          `{/* Carousel requires Angular */}`,
          `{# Carousel in onboarding wizard #}`,
          `// viking-carousel is Angular-only`,
        ),
      ),
      entry(
        {
          id: "toggle",
          name: "Toggle group",
          description:
            "Segmented single-select control for view modes and filters.",
          preview: `<div class="viking-toggle-group-static" role="group" aria-label="View mode">
  <button type="button" class="viking-tab viking-tab-active">Chart</button>
  <button type="button" class="viking-tab">Table</button>
  <button type="button" class="viking-tab">Raw</button>
</div>`,
          selector: "viking-toggle-group",
        },
        snippets(
          `<viking-toggle-group [(value)]="viewMode"><viking-toggle value="chart">Chart</viking-toggle></viking-toggle-group>`,
          `<div class="viking-toggle-group-static" role="group"><button class="viking-tab viking-tab-active">Chart</button></div>`,
          `<div class="viking-toggle-group-static" role="group">...</div>`,
          `group.setAttribute('role', 'group');`,
        ),
      ),
      entry(
        {
          id: "fab",
          name: "FAB",
          description: "Floating action button for primary mobile workflows.",
          preview: `<div class="viking-demo-relative-min">
  <button type="button" class="viking-fab-static" aria-label="Create incident">+</button>
</div>`,
          selector: "viking-fab",
        },
        snippets(
          `<viking-fab icon="plus" aria-label="Create incident" (pressed)="create()" />`,
          `<button type="button" class="viking-fab-static" aria-label="Create">+</button>`,
          `<button type="button" class="viking-fab-static" aria-label="{{ action.label }}">+</button>`,
          `fab.className = 'viking-fab-static';`,
        ),
      ),
      entry(
        {
          id: "scroll-area",
          name: "Scroll area",
          description:
            "Tokenized overflow container for dense tables and code blocks.",
          preview: `<div class="viking-scroll-area-static" tabindex="0">
  <p class="viking-text-muted">Long content scrolls inside machined border…</p>
  <p class="viking-text-muted">Line 2 · Line 3 · Line 4 · Line 5</p>
</div>`,
          selector: "viking-scroll-area",
        },
        snippets(
          `<viking-scroll-area [maxHeight]="320"><viking-table>...</viking-table></viking-scroll-area>`,
          `<div class="viking-scroll-area-static" tabindex="0">...</div>`,
          `<div class="viking-scroll-area-static">{{ content }}</div>`,
          `area.className = 'viking-scroll-area-static';`,
        ),
      ),
    ],
  },
  {
    id: "actions-dialogs",
    label: "Actions & Dialogs",
    description: "Confirm dialogs, button groups, and contextual actions.",
    components: [
      entry(
        {
          id: "confirm-dialog",
          name: "Confirm dialog",
          description:
            "Destructive action confirmation via VikingDialogService.",
          preview: `<div class="showcase-modal-demo" aria-hidden="true">
  <div class="showcase-modal-backdrop"></div>
  <div class="showcase-modal-panel viking-card">
    <header class="viking-card-header"><h3 class="viking-heading viking-heading-sm">Delete tenant?</h3></header>
    <p class="viking-text-muted">Permanently removes UUID isolation data.</p>
    <footer class="viking-demo-row">
      <viking-button-wc variant="danger">Delete</viking-button-wc>
      <viking-button-wc variant="outline">Cancel</viking-button-wc>
    </footer>
  </div>
</div>`,
          selector: "viking-confirm-dialog",
          wcSelector: "viking-modal-wc",
          api: getComponentApi("modal"),
          tags: ["angular", "web-component"],
        },
        snippets(
          `this.dialog.confirm({ title: 'Delete tenant?', confirmVariant: 'danger' });`,
          `<viking-modal-wc title="Confirm action"><viking-button-wc slot="actions" variant="danger">Confirm</viking-button-wc></viking-modal-wc>`,
          `{# Use native dialog + viking-card for Django confirmations #}`,
          `document.querySelector('viking-modal-wc')?.setAttribute('open', '');`,
        ),
      ),
      entry(
        {
          id: "button-group",
          name: "Button group",
          description: "Grouped actions with shared borders and roving focus.",
          preview: `<div class="viking-button-group-static" role="group" aria-label="Export formats">
  <viking-button-wc variant="outline" size="sm">CSV</viking-button-wc>
  <viking-button-wc variant="outline" size="sm">JSON</viking-button-wc>
  <viking-button-wc variant="outline" size="sm">Parquet</viking-button-wc>
</div>`,
          selector: "viking-button-group",
        },
        snippets(
          `<viking-button-group><viking-button variant="outline">CSV</viking-button></viking-button-group>`,
          `<div class="viking-button-group-static" role="group"><viking-button-wc variant="outline">CSV</viking-button-wc></div>`,
          `<div class="viking-button-group-static" role="group">...</div>`,
          `group.className = 'viking-button-group-static';`,
        ),
      ),
      entry(
        {
          id: "whitepaper-cta",
          name: "Whitepaper CTA",
          description: "Marketing call-to-action block for research downloads.",
          preview: `<div class="viking-whitepaper-cta-static viking-card">
  <h3 class="viking-heading viking-heading-sm">Read the whitepaper</h3>
  <p class="viking-text-muted">Event projections architecture for operational ML platforms.</p>
  <viking-button-wc variant="primary">Download PDF</viking-button-wc>
</div>`,
          selector: "viking-whitepaper-cta",
        },
        snippets(
          `<viking-whitepaper-cta title="Read the whitepaper" href="/whitepaper.pdf" />`,
          `<div class="viking-whitepaper-cta-static viking-card">...</div>`,
          `<div class="viking-whitepaper-cta-static">{{ cta.title }}</div>`,
          `cta.className = 'viking-whitepaper-cta-static';`,
        ),
      ),
    ],
  },
];
