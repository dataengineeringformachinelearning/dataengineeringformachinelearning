import type { Meta, StoryObj } from "@storybook/html";

/** CSS-backed Angular surfaces shown as static HTML for Storybook (HTML framework). */
const renderMetricCards = () => `
  <div class="viking-story-panel viking-story-wide">
    <header class="viking-story-header">
      <span class="viking-label">Surfaces</span>
      <h2 class="viking-heading-md">Metric cards</h2>
      <p class="viking-text-muted">Tokenized dashboard density used by Angular <code>viking-metric-card</code>.</p>
    </header>
    <div class="viking-story-grid cols-2">
      <article class="viking-metric-card">
        <div class="viking-metric-card-copy">
          <span class="viking-metric-label">P99 latency</span>
          <strong class="viking-metric-value">42 ms</strong>
        </div>
      </article>
      <article class="viking-metric-card viking-metric-card-warning">
        <div class="viking-metric-card-copy">
          <span class="viking-metric-label">Error rate</span>
          <strong class="viking-metric-value">1.8%</strong>
        </div>
      </article>
      <article class="viking-metric-card viking-metric-card-critical">
        <div class="viking-metric-card-copy">
          <span class="viking-metric-label">DLQ depth</span>
          <strong class="viking-metric-value">126</strong>
        </div>
      </article>
      <article class="viking-metric-card viking-metric-card-tall">
        <div class="viking-metric-card-copy">
          <span class="viking-metric-label">Requests / 24h</span>
          <strong class="viking-metric-value">2.4M</strong>
        </div>
      </article>
    </div>
  </div>
`;

const renderHudPanel = () => `
  <div class="viking-story-panel viking-story-wide">
    <header class="viking-story-header">
      <span class="viking-label">Surfaces</span>
      <h2 class="viking-heading-md">HUD panel</h2>
      <p class="viking-text-muted">Dense telemetry shell used by Angular <code>viking-hud-panel</code>.</p>
    </header>
    <section class="viking-hud-panel">
      <header class="viking-hud-panel-header">
        <h3 class="viking-hud-panel-title">Live projection</h3>
        <viking-status-pill tone="success" icon="check" compact>Synced</viking-status-pill>
      </header>
      <div class="viking-story-grid cols-2">
        <article class="viking-metric-card">
          <div class="viking-metric-card-copy">
            <span class="viking-metric-label">Ingest</span>
            <strong class="viking-metric-value">18.2k/m</strong>
          </div>
        </article>
        <article class="viking-metric-card">
          <div class="viking-metric-card-copy">
            <span class="viking-metric-label">Threats</span>
            <strong class="viking-metric-value">3</strong>
          </div>
        </article>
      </div>
    </section>
  </div>
`;

const renderChartPanelShell = () => `
  <div class="viking-story-panel viking-story-wide">
    <header class="viking-story-header">
      <span class="viking-label">Surfaces</span>
      <h2 class="viking-heading-md">Chart panel shell</h2>
      <p class="viking-text-muted">
        Loading and empty states for Angular <code>viking-chart-panel</code> (native SVG chart renders in-app).
      </p>
    </header>
    <div class="viking-story-grid cols-2">
      <div class="viking-chart-panel viking-story-chart-slot" data-loading="true">
        <div class="viking-chart-panel-header">
          <h3 class="viking-heading-sm">Latency</h3>
        </div>
        <div class="viking-skeleton viking-story-skeleton-block" aria-hidden="true"></div>
      </div>
      <div class="viking-chart-panel viking-story-chart-slot">
        <div class="viking-chart-panel-header">
          <h3 class="viking-heading-sm">Threat mix</h3>
        </div>
        <div class="viking-chart-empty">
          <p class="viking-text-muted">No series in the selected window.</p>
        </div>
      </div>
    </div>
  </div>
`;

const meta: Meta = {
  title: "Viking Web Components/Surfaces",
  tags: ["autodocs"],
};

export default meta;

export const MetricCards: StoryObj = {
  name: "MetricCards",
  render: renderMetricCards,
};

export const HudPanel: StoryObj = {
  name: "HudPanel",
  render: renderHudPanel,
};

export const ChartPanelShell: StoryObj = {
  name: "ChartPanelShell",
  render: renderChartPanelShell,
};
