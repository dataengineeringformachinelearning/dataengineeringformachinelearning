import type { Meta, StoryObj } from "@storybook/html";

/** Static suite chrome — matches forjd-ui Primitives/Surface for Chromatic parity. */
const render = () => `
  <div class="suite-story-panel viking-story-panel suite-story-wide suite-story-stack">
    <p class="suite-story-kicker">Primitives · Surface</p>
    <nav class="suite-nav fj-nav">
      <a class="suite-nav-link fj-nav-link" data-active="true" href="#">Docs</a>
      <a class="suite-nav-link fj-nav-link" href="#">API</a>
    </nav>
    <div class="suite-card viking-card fj-card">
      <div class="suite-story-row">
        <span class="suite-avatar fj-avatar" data-size="md"><span>OP</span></span>
        <span class="suite-badge viking-badge fj-badge" data-tone="success">Live</span>
      </div>
      <hr class="suite-separator fj-separator" />
      <div class="suite-tabs fj-tabs">
        <div class="suite-tabs-list fj-tabs-list" role="tablist">
          <button type="button" class="suite-tab fj-tab" role="tab" aria-selected="true">Overview</button>
          <button type="button" class="suite-tab fj-tab" role="tab" aria-selected="false">Events</button>
        </div>
        <div class="suite-tab-panel fj-tab-panel" role="tabpanel">
          Dense table + empty + skeleton on suite chrome.
        </div>
      </div>
      <div class="suite-table-wrap fj-table-wrap">
        <table class="suite-table fj-table">
          <thead><tr><th>Tenant</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>acme</td><td>healthy</td></tr>
            <tr><td>northwind</td><td>degraded</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="suite-skeleton fj-skeleton" data-variant="rect"></div>
    <div class="suite-empty fj-empty">
      <p class="suite-empty-title fj-empty-title">No projections</p>
      <p class="suite-empty-description">Ingest events to populate stream_results.</p>
      <div class="suite-empty-actions">
        <button type="button" class="suite-btn viking-btn" data-variant="outline">Open docs</button>
      </div>
    </div>
  </div>
`;

const meta: Meta = {
  title: "Primitives/Surface",
  tags: ["autodocs"],
  render,
};

export default meta;
type Story = StoryObj;

export const CardNavTabsTable: Story = {};
