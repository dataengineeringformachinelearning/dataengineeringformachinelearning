import type { ShowcaseCategory } from "./component-registry";
import {
  defineShowcaseComponent as entry,
  defineSnippets as snippets,
} from "./component-registry-kit";

/** Final batch toward full Angular export parity (~90 documented demos). */
export const FULL_SHOWCASE_CATEGORIES: ShowcaseCategory[] = [
  {
    id: "specialized-inputs",
    label: "Specialized Inputs",
    description:
      "Calendar grids, color swatches, custom selects, and verification fields.",
    components: [
      entry(
        {
          id: "calendar",
          name: "Calendar",
          description:
            "Month-grid date picker with keyboard navigation and ISO value binding.",
          preview: `<div class="viking-card viking-card-compact viking-demo-card-lg">
  <div class="viking-demo-row viking-demo-row-between">
    <viking-button-wc variant="ghost" size="sm" aria-label="Previous year">«</viking-button-wc>
    <viking-button-wc variant="ghost" size="sm" aria-label="Previous month">‹</viking-button-wc>
    <span class="viking-label">July 2026</span>
    <viking-button-wc variant="ghost" size="sm" aria-label="Next month">›</viking-button-wc>
    <viking-button-wc variant="ghost" size="sm" aria-label="Next year">»</viking-button-wc>
  </div>
  <div class="viking-demo-row viking-demo-row-wrap viking-demo-row-gap-xs viking-demo-muted-xs" aria-hidden="true">
    <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
  </div>
  <div class="viking-demo-row viking-demo-row-wrap viking-demo-row-gap-xs" role="grid" aria-label="Days of month">
    <viking-button-wc variant="ghost" size="sm" aria-label="June 28">28</viking-button-wc>
    <viking-button-wc variant="ghost" size="sm" aria-label="June 29">29</viking-button-wc>
    <viking-button-wc variant="ghost" size="sm" aria-label="June 30">30</viking-button-wc>
    <viking-button-wc variant="ghost" size="sm" aria-label="July 1">1</viking-button-wc>
    <viking-button-wc variant="ghost" size="sm" aria-label="July 2">2</viking-button-wc>
    <viking-button-wc variant="primary" size="sm" aria-label="July 3 selected" aria-current="date">3</viking-button-wc>
    <viking-button-wc variant="ghost" size="sm" aria-label="July 4">4</viking-button-wc>
    <viking-button-wc variant="ghost" size="sm" aria-label="July 5">5</viking-button-wc>
    <viking-button-wc variant="ghost" size="sm" aria-label="July 6">6</viking-button-wc>
    <viking-button-wc variant="ghost" size="sm" aria-label="July 7">7</viking-button-wc>
    <viking-button-wc variant="ghost" size="sm" aria-label="July 8">8</viking-button-wc>
    <viking-button-wc variant="ghost" size="sm" aria-label="July 9">9</viking-button-wc>
    <viking-button-wc variant="ghost" size="sm" aria-label="July 10">10</viking-button-wc>
    <viking-button-wc variant="ghost" size="sm" aria-label="July 11">11</viking-button-wc>
  </div>
</div>
<p class="viking-text-muted viking-demo-caption">Year + month arrows and a denser day grid</p>`,
          selector: "viking-calendar",
          tags: ["angular", "forms"],
          related: ["date-picker"],
        },
        snippets(
          `import { VikingCalendar } from '@dataengineeringformachinelearning/viking-ui';

<viking-calendar [(value)]="incidentDate" />`,
          `{/* Calendar requires Angular — use native date input for static pages */}`,
          `<input type="date" class="viking-input-native" name="incident_date" />`,
          `// viking-calendar binds ISO date strings (YYYY-MM-DD)`,
        ),
      ),
      entry(
        {
          id: "color-picker",
          name: "Color picker",
          description:
            "Series preset swatches plus custom color input — maps to --viking-series-* tokens.",
          preview: `<div class="viking-demo-row" role="group" aria-label="Color picker">
  <button type="button" class="viking-btn viking-btn-outline viking-btn-compact viking-series-border-1" aria-label="Series 1" aria-pressed="true">✓</button>
  <button type="button" class="viking-btn viking-btn-outline viking-btn-compact viking-series-border-2" aria-label="Series 2"></button>
  <button type="button" class="viking-btn viking-btn-outline viking-btn-compact viking-series-border-3" aria-label="Series 3"></button>
  <input type="color" class="viking-input-native viking-demo-color-input" aria-label="Custom color" />
</div>`,
          selector: "viking-color-picker",
          tags: ["angular", "forms"],
          related: ["chart"],
        },
        snippets(
          `import { VIKING_SERIES_PRESETS, VikingColorPicker } from '@dataengineeringformachinelearning/viking-ui';

<viking-color-picker [(value)]="seriesColor" [presets]="VIKING_SERIES_PRESETS" />`,
          `{/* Color picker is Angular-only — use CSS var(--viking-series-*) in static charts */}`,
          `<input type="color" class="viking-input-native" name="series_color" />`,
          `// viking-color-picker uses VIKING_SERIES_PRESETS from the library`,
        ),
      ),
      entry(
        {
          id: "custom-select",
          name: "Custom select",
          description:
            "Styled combobox with keyboard navigation — distinct from native-select.",
          preview: `<div class="viking-field">
  <label class="viking-field-label" for="worker-select">Worker</label>
  <div class="viking-select-demo">
    <button id="worker-select" type="button" class="viking-select-trigger-static" aria-haspopup="listbox" aria-expanded="true" aria-controls="worker-select-list">
      <span>telemetry_worker</span>
      <span aria-hidden="true">▾</span>
    </button>
    <ul id="worker-select-list" class="viking-select-panel-static" role="listbox" aria-label="Worker">
      <li role="option" aria-selected="true" class="is-selected">telemetry_worker</li>
      <li role="option">outbox_relay</li>
      <li role="option">threat_scanner</li>
    </ul>
  </div>
</div>
<p class="viking-text-muted viking-demo-caption">Single trigger + open listbox — not nested input shells</p>`,
          selector: "viking-select",
          tags: ["angular"],
          related: ["native-select", "select"],
        },
        snippets(
          `<viking-select label="Worker" [(value)]="worker" [options]="workerOptions" />`,
          `{/* Custom select requires Angular — use viking-select-wc or native-select for static */}`,
          `<select class="viking-select-native" name="worker"><option>telemetry_worker</option></select>`,
          `// viking-select provides styled combobox with roving focus`,
        ),
      ),
      entry(
        {
          id: "verification-code-field",
          name: "Verification code field",
          description:
            "Labeled OTP fieldset for MFA and phone verification with error states.",
          preview: `<fieldset class="viking-field">
  <legend class="viking-field-label" id="verify-code-legend">Verification Code</legend>
  <div class="viking-otp-static" role="group" aria-labelledby="verify-code-legend">
    <input type="text" name="one-time-code" inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="one-time-code" aria-label="Digit 1 of verification code" />
    <input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="one-time-code" aria-label="Digit 2 of verification code" />
    <input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="one-time-code" aria-label="Digit 3 of verification code" />
    <input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="one-time-code" aria-label="Digit 4 of verification code" />
    <input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="one-time-code" aria-label="Digit 5 of verification code" />
    <input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="one-time-code" aria-label="Digit 6 of verification code" />
  </div>
  <p class="viking-text-muted">Enter the 6-digit code we sent to your phone.</p>
</fieldset>
<p class="viking-text-muted viking-demo-caption">autocomplete=&quot;one-time-code&quot; for SMS autofill</p>`,
          selector: "viking-verification-code-field",
          tags: ["angular", "auth"],
          related: ["otp-input", "auth-panel"],
        },
        snippets(
          `<viking-verification-code-field
  label="Verification Code"
  name="one-time-code"
  [length]="6"
  [(value)]="code"
  [required]="true"
/>`,
          `{/* Verification field requires Angular auth runtime */}`,
          `{# MFA verification via viking-verification-code-field in Angular shell #}`,
          `// viking-verification-code-field wraps viking-otp-input with field semantics`,
        ),
      ),
    ],
  },
  {
    id: "rich-content",
    label: "Rich Content",
    description: "Message composers and lightweight rich-text editors.",
    components: [
      entry(
        {
          id: "composer",
          name: "Composer",
          description:
            "Message composer with attachments slot and send action for incident threads.",
          preview: `<div class="viking-card viking-card-compact">
  <textarea class="viking-textarea-static" rows="2" placeholder="Add a runbook note…"></textarea>
  <div class="viking-demo-row viking-demo-row-between viking-demo-mt-1">
    <viking-button-wc variant="ghost" size="sm">Attach</viking-button-wc>
    <viking-button-wc variant="primary" size="sm">Send</viking-button-wc>
  </div>
</div>`,
          selector: "viking-composer",
          tags: ["angular"],
        },
        snippets(
          `<viking-composer
  placeholder="Add a runbook note…"
  [(value)]="note"
  [allowAttachments]="true"
  (send)="postNote()"
/>`,
          `{/* Composer requires Angular runtime */}`,
          `<textarea class="viking-textarea-static" name="note" placeholder="Add a note…"></textarea>`,
          `// viking-composer emits send and attach events`,
        ),
      ),
      entry(
        {
          id: "editor",
          name: "Editor",
          description:
            "Zero-dependency contenteditable with formatting toolbar — outputs HTML.",
          preview: `<div class="viking-card viking-card-compact">
  <div class="viking-demo-row">
    <viking-button-wc variant="ghost" size="sm" aria-label="Bold"><strong>B</strong></viking-button-wc>
    <viking-button-wc variant="ghost" size="sm" aria-label="Italic"><em>I</em></viking-button-wc>
    <viking-button-wc variant="ghost" size="sm" aria-label="List">≡</viking-button-wc>
  </div>
  <div class="viking-textarea-static viking-demo-textarea" contenteditable="true" role="textbox" aria-label="Rich text editor">Document rollback steps for <strong>telemetry_worker</strong>…</div>
</div>`,
          selector: "viking-editor",
          tags: ["angular"],
          related: ["textarea"],
        },
        snippets(
          `<viking-field label="Runbook">
  <viking-editor [(value)]="runbookHtml" placeholder="Document rollback steps…" />
</viking-field>`,
          `{/* Editor requires Angular — use textarea for static Astro/Django */}`,
          `<textarea class="viking-textarea-static" name="runbook">{{ runbook }}</textarea>`,
          `// viking-editor is ControlValueAccessor-compatible with HTML output`,
        ),
      ),
    ],
  },
  {
    id: "display-extended",
    label: "Extended Display",
    description: "Icon headings, profile blocks, and chart card headers.",
    components: [
      entry(
        {
          id: "icon-heading",
          name: "Icon heading",
          description:
            "Icon + title lockup for settings sections and dashboard panels.",
          preview: `<div class="viking-demo-full viking-icon-heading-stack">
  <div class="viking-icon-heading">
    <span class="viking-icon-heading__icon" aria-hidden="true">◆</span>
    <h3 class="viking-icon-heading__title">Threat scoring</h3>
  </div>
  <p class="viking-text-muted">Behavioral biometrics and AbuseIPDB enrichment at ingress.</p>
</div>`,
          selector: "viking-icon-heading",
          related: ["icon", "page-header"],
        },
        snippets(
          `<viking-icon-heading icon="shield" title="Threat scoring" />`,
          `<div class="viking-icon-heading"><span class="viking-icon-heading__icon">◆</span><h3 class="viking-icon-heading__title">Threat scoring</h3></div>`,
          `<div class="viking-icon-heading"><h3 class="viking-icon-heading__title">{{ section.title }}</h3></div>`,
          `// Use viking-icon-heading in Angular for full icon registry`,
        ),
      ),
      entry(
        {
          id: "icon-text",
          name: "Icon text",
          description:
            "Icon beside title and description for status rows and account settings.",
          preview: `<div class="viking-demo-row viking-demo-row-top">
  <span class="viking-icon-badge-static" aria-hidden="true">✓</span>
  <div>
    <strong class="viking-text">MFA enrolled</strong>
    <p class="viking-text-muted">Authenticator app verified · last used 2h ago</p>
  </div>
</div>`,
          selector: "viking-icon-text",
          tags: ["angular"],
          related: ["icon-badge"],
        },
        snippets(
          `<viking-icon-text icon="shield-check" title="MFA enrolled" description="Authenticator verified" tone="success" />`,
          `<div class="viking-demo-row"><span class="viking-icon-badge-static">✓</span><strong class="viking-text">MFA enrolled</strong></div>`,
          `<div class="viking-icon-text"><strong>{{ row.title }}</strong><span class="viking-text-muted">{{ row.detail }}</span></div>`,
          `// viking-icon-text pairs Viking icons with title + description`,
        ),
      ),
      entry(
        {
          id: "profile",
          name: "Profile",
          description:
            "User identity block with avatar, name, detail, and actions slot.",
          preview: `<div class="viking-demo-row">
  <span class="viking-avatar-static" aria-hidden="true">CT</span>
  <div>
    <strong class="viking-text">Commander Tenant</strong>
    <p class="viking-text-muted">Security Admin · Tenant0</p>
  </div>
  <viking-button-wc variant="outline" size="sm">Edit</viking-button-wc>
</div>`,
          selector: "viking-profile",
          tags: ["angular"],
          related: ["avatar"],
        },
        snippets(
          `<viking-profile name="Commander Tenant" detail="Security Admin" status="online">
  <viking-button variant="outline" size="sm">Edit</viking-button>
</viking-profile>`,
          `<div class="viking-demo-row"><span class="viking-avatar-static">CT</span><strong>Commander Tenant</strong></div>`,
          `<div class="viking-profile"><span class="viking-avatar-static">{{ user.initials }}</span><strong>{{ user.name }}</strong></div>`,
          `// viking-profile composes viking-avatar with identity text`,
        ),
      ),
      entry(
        {
          id: "chart-card-header",
          name: "Chart card header",
          description:
            "Shared label / value / trend header for analytics chart cards.",
          preview: `<div class="chart-custom-header viking-card-header">
  <div class="chart-custom-title">P99 latency</div>
  <div class="chart-custom-value">42ms</div>
  <div class="chart-custom-trend viking-badge viking-badge-success">↓ 12%</div>
</div>`,
          selector: "viking-chart-card-header",
          related: ["chart-panel", "metric-card"],
        },
        snippets(
          `<viking-chart-panel>
  <viking-chart-card-header title="P99 latency" value="42ms" trend="↓ 12%" />
  <viking-chart kind="line" [data]="series" />
</viking-chart-panel>`,
          `<div class="chart-custom-header"><div class="chart-custom-title">P99 latency</div><div class="chart-custom-value">42ms</div></div>`,
          `<div class="chart-custom-header"><div class="chart-custom-title">{{ metric.label }}</div><div class="chart-custom-value">{{ metric.value }}</div></div>`,
          `// chart-custom-* classes ship in viking-ui.css for static pages`,
        ),
      ),
      entry(
        {
          id: "metric-row",
          name: "Metric row",
          description:
            "Compact horizontal KPI row for dense dashboard headers.",
          preview: `<div class="viking-status-metric-row">
  <span class="viking-label">Events/sec</span>
  <strong class="viking-metric">8.2K</strong>
  <viking-badge-wc tone="accent">Live</viking-badge-wc>
</div>`,
          selector: "viking-metric-row",
          related: ["metric-card", "status-metric-row"],
        },
        snippets(
          `<viking-metric-row label="Events/sec" value="8.2K" tone="accent" />`,
          `<div class="viking-status-metric-row"><span class="viking-label">Events/sec</span><strong class="viking-metric">8.2K</strong></div>`,
          `<div class="viking-status-metric-row"><span class="viking-label">{{ row.label }}</span><strong class="viking-metric">{{ row.value }}</strong></div>`,
          `row.className = 'viking-status-metric-row';`,
        ),
      ),
    ],
  },
  {
    id: "navigation-chrome",
    label: "Navigation Chrome",
    description: "In-app navbar, marketing footer, and back navigation.",
    components: [
      entry(
        {
          id: "navbar",
          name: "Navbar",
          description:
            "Horizontal in-app navigation with items and active state.",
          preview: `<nav class="viking-menubar-static" role="navigation" aria-label="Application">
  <a href="#" class="viking-nav-item-static is-active">Overview</a>
  <a href="#" class="viking-nav-item-static">Metrics</a>
  <a href="#" class="viking-nav-item-static">Security</a>
  <a href="#" class="viking-nav-item-static">Settings</a>
</nav>`,
          selector: "viking-navbar",
          tags: ["angular"],
          related: ["navigation-menu", "site-navbar"],
        },
        snippets(
          `<viking-navbar>
  <viking-navbar-item href="/overview" [active]="true">Overview</viking-navbar-item>
  <viking-navbar-item href="/metrics">Metrics</viking-navbar-item>
</viking-navbar>`,
          `<nav class="viking-nav-menu-static" aria-label="Application">...</nav>`,
          `<nav class="viking-nav-menu-static">{% for item in nav %}<a href="{{ item.url }}">{{ item.label }}</a>{% endfor %}</nav>`,
          `// viking-navbar for in-app horizontal navigation`,
        ),
      ),
      entry(
        {
          id: "site-footer",
          name: "Site footer",
          description:
            "Marketing-grade footer with directory columns and compliance links.",
          preview: `<footer class="viking-card viking-card-compact">
  <div class="viking-demo-row viking-demo-row-top viking-demo-row-wrap viking-demo-row-gap-lg">
    <div>
      <span class="viking-label">Product</span>
      <p class="viking-text-muted">Platform</p>
      <p class="viking-text-muted">Integrations</p>
    </div>
    <div>
      <span class="viking-label">Resources</span>
      <p class="viking-text-muted">Documentation</p>
      <p class="viking-text-muted">Whitepaper</p>
    </div>
  </div>
  <hr class="viking-separator-static" />
  <p class="viking-text-muted">© 2026 Data Engineering for AI Engineering and Cybersecurity</p>
</footer>`,
          selector: "viking-site-footer",
          tags: ["angular", "marketing"],
          related: ["footer", "site-navbar"],
        },
        snippets(
          `import { VikingSiteFooter, DEFAULT_SITE_URLS } from '@dataengineeringformachinelearning/viking-ui';

<viking-site-footer [urls]="DEFAULT_SITE_URLS" />`,
          `{/* Marketing uses static footer markup + viking-ui.css — see marketing/src/components */}`,
          `{# partials/site_footer.html with viking-ui.css #}`,
          `// See SITE_FOOTER_COLUMNS in site-drakkar.config.ts`,
        ),
      ),
      entry(
        {
          id: "page-back-link",
          name: "Page back link",
          description:
            "Consistent dashboard back navigation with icon and tokenized spacing.",
          preview: `<nav class="viking-page-back-link-host" aria-label="Back navigation">
  <a href="/components" class="viking-page-back-link">
    <span aria-hidden="true">←</span>
    <span>Back to components</span>
  </a>
</nav>`,
          selector: "viking-page-back-link",
          related: ["breadcrumbs", "page-header"],
        },
        snippets(
          `<viking-page-back-link route="/settings" label="Back to settings" />`,
          `<nav class="viking-page-back-link-host"><a href="/settings" class="viking-page-back-link">← Back to settings</a></nav>`,
          `<nav class="viking-page-back-link-host"><a href="{{ back_url }}" class="viking-page-back-link">← {{ back_label }}</a></nav>`,
          `// viking-page-back-link uses RouterLink in Angular apps`,
        ),
      ),
    ],
  },
  {
    id: "menus-context",
    label: "Menus & Context",
    description: "Right-click context menus and contextual actions.",
    components: [
      entry(
        {
          id: "context",
          name: "Context menu",
          description:
            "Right-click menu wrapper — project viking-menu-item elements with vikingMenu attribute.",
          preview: `<div class="viking-card viking-card-compact viking-demo-card-md">
  <p class="viking-text-muted">Right-click this card in Angular apps</p>
  <div class="viking-card viking-card-compact viking-demo-mt-1 viking-demo-elevated">
    <span class="viking-text">Deploy</span>
    <span class="viking-text-muted">View logs</span>
    <span class="viking-text-muted">Rollback</span>
  </div>
</div>`,
          selector: "viking-context",
          tags: ["angular"],
          related: ["dropdown", "command"],
        },
        snippets(
          `<viking-context>
  <viking-card>Right-click me</viking-card>
  <div vikingMenu>
    <viking-menu-item (select)="deploy()">Deploy</viking-menu-item>
    <viking-menu-item (select)="rollback()">Rollback</viking-menu-item>
  </div>
</viking-context>`,
          `{/* Context menu requires Angular positioning */}`,
          `{# Context menus via viking-context in Angular admin #}`,
          `// viking-context listens for contextmenu and positions [vikingMenu] content`,
        ),
      ),
    ],
  },
];
