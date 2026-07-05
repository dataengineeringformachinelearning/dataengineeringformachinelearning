import type { Meta, StoryObj } from "@storybook/html";

const renderBattlefieldCommand = () => `
  <div class="viking-story-battlefield page-inner-wrapper">
    <header class="viking-command-strip">
      <div class="viking-command-strip__meta viking-status-rail">
        <p class="viking-rune-caption">Drakkar Command · Sector North</p>
        <h1 class="viking-command-strip__title hud-title">Battlefield Operations</h1>
        <p class="viking-command-strip__subtitle hud-subtitle">
          Lockheed-grade telemetry with Norse command chrome — live threat mesh and projection health.
        </p>
      </div>
      <div class="viking-story-row">
        <viking-badge tone="success">Mesh Online</viking-badge>
        <viking-badge tone="warning">2 Alerts</viking-badge>
        <viking-button variant="primary">Deploy Scanner</viking-button>
        <viking-button variant="outline">Export Trace</viking-button>
      </div>
    </header>

    <section class="viking-metric-row hud-metrics" aria-label="Command metrics">
      <article class="viking-metric-card">
        <span class="viking-metric-label viking-rune-caption">Active Nodes</span>
        <span class="viking-metric-value viking-readout">128</span>
      </article>
      <article class="viking-metric-card viking-metric-card-warning">
        <span class="viking-metric-label viking-rune-caption">Latency P99</span>
        <span class="viking-metric-value viking-readout">842ms</span>
      </article>
      <article class="viking-metric-card">
        <span class="viking-metric-label viking-rune-caption">Projections</span>
        <span class="viking-metric-value viking-readout">99.2%</span>
      </article>
      <article class="viking-metric-card viking-metric-card-critical">
        <span class="viking-metric-label viking-rune-caption">Threat Score</span>
        <span class="viking-metric-value viking-readout">7.4</span>
      </article>
    </section>

    <div class="viking-story-grid cols-2">
      <section class="viking-hud-panel viking-hud-panel--command panel-section">
        <header class="viking-hud-panel-header panel-header">
          <h2 class="viking-hud-panel-title">Threat Vector</h2>
          <viking-badge tone="danger">Elevated</viking-badge>
        </header>
        <div class="viking-hud-panel-body panel-body">
          <viking-callout tone="warning" heading="Anomaly cluster detected">
            Polars aggregation flagged asymmetric ingress on Tenant0 edge — review projection lag.
          </viking-callout>
          <div class="viking-story-row" style="margin-top: var(--viking-space-2);">
            <viking-button variant="secondary" size="sm">Acknowledge</viking-button>
            <viking-button variant="ghost" size="sm">Open Runbook</viking-button>
          </div>
        </div>
      </section>

      <section class="viking-hud-panel panel-section">
        <header class="viking-hud-panel-header panel-header">
          <h2 class="viking-hud-panel-title">Field Comms</h2>
          <viking-badge tone="accent">Secure</viking-badge>
        </header>
        <div class="viking-hud-panel-body panel-body">
          <viking-field label="Operator Callsign" description="Norse callsign for this watch rotation.">
            <viking-input placeholder="e.g. SKJOLD-7" value="DRAKKAR-0"></viking-input>
          </viking-field>
          <div class="viking-story-row" style="margin-top: var(--viking-space-2);">
            <viking-select label="Sector">
              <option value="north" selected>North Atlantic</option>
              <option value="baltic">Baltic Grid</option>
              <option value="arctic">Arctic Relay</option>
            </viking-select>
          </div>
        </div>
      </section>
    </div>

    <section class="viking-card viking-card-tactical">
      <header class="viking-card-header">
        <h2 class="viking-font-tactical">Event Projection Loop</h2>
        <p class="viking-rune-caption">Outbox → Redpanda → Worker → Firestore</p>
      </header>
      <div class="viking-card-body">
        <div class="viking-story-row">
          <viking-badge tone="success">Outbox</viking-badge>
          <viking-badge tone="success">Relay</viking-badge>
          <viking-badge tone="info">Worker</viking-badge>
          <viking-badge tone="muted">DLQ Empty</viking-badge>
        </div>
      </div>
    </section>
  </div>
`;

const meta: Meta = {
  title: "Viking Battlefield/Command Dashboard",
  tags: ["autodocs"],
  render: renderBattlefieldCommand,
  parameters: {
    docs: {
      description: {
        component:
          "Lockheed Martin precision HUD chrome with Norse command typography — the canonical battlefield dashboard shell for deml.app, backend, and docs.",
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const NightWatch: Story = {};

export const WithThemeToggle: Story = {
  render: () => `
    ${renderBattlefieldCommand()}
    <div style="position: fixed; bottom: var(--viking-space-3); right: var(--viking-space-3);">
      <viking-theme-toggle></viking-theme-toggle>
    </div>
  `,
};
