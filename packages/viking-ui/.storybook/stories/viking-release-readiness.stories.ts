import type { Meta, StoryObj } from "@storybook/html";

const renderPublishingReadiness = () => `
  <div class="viking-story-panel">
    <div class="viking-story-stack">
      <header class="viking-story-header">
        <span class="viking-label">Release cockpit</span>
        <h2 class="viking-heading-md">Viking-UI publishing readiness</h2>
        <p class="viking-text-muted">
          The published package is the single source of truth for tokens, static CSS,
          Web Components, framework-neutral utilities, and Angular wrappers.
        </p>
      </header>

      <div class="viking-story-metric-row" aria-label="Release gates">
        <div class="viking-story-metric">
          <span class="viking-label">Package</span>
          <strong class="viking-metric">v4.0.4</strong>
          <viking-badge tone="success" icon="check">npm ready</viking-badge>
        </div>
        <div class="viking-story-metric">
          <span class="viking-label">Snapshots</span>
          <strong class="viking-metric">3</strong>
          <viking-badge tone="accent" icon="shield">Chromatic widths</viking-badge>
        </div>
        <div class="viking-story-metric">
          <span class="viking-label">Entrypoints</span>
          <strong class="viking-metric">CSS WC NG</strong>
          <viking-badge tone="muted" icon="sparkle">Clean exports</viking-badge>
        </div>
      </div>

      <div class="viking-story-grid cols-3">
        <viking-card compact>
          <span class="viking-label">npm</span>
          <h3 class="viking-heading-sm">App-first installation</h3>
          <p class="viking-text-muted">
            Angular, Astro, and application builds import package entrypoints directly.
          </p>
          <code>npm install @dataengineeringformachinelearning/viking-ui</code>
        </viking-card>

        <viking-card compact>
          <span class="viking-label">CDN</span>
          <h3 class="viking-heading-sm">External embeds</h3>
          <p class="viking-text-muted">
            Static surfaces load the built CSS and Web Component bundles from jsDelivr.
          </p>
          <code>@latest/dist/web-components.js</code>
        </viking-card>

        <viking-card compact>
          <span class="viking-label">Chromatic</span>
          <h3 class="viking-heading-sm">Visual gate</h3>
          <p class="viking-text-muted">
            Storybook snapshots publish from the built static directory after package validation.
          </p>
          <code>packages/viking-ui/storybook-static</code>
        </viking-card>
      </div>

      <viking-callout tone="accent" heading="Publishing workflow">
        Build the package, build Storybook, run the package tests, dry-run npm pack, then publish
        through Changesets with Chromatic snapshots attached to the release.
      </viking-callout>
    </div>
  </div>
`;

const renderCoreMatrix = () => `
  <div class="viking-story-panel">
    <div class="viking-story-stack">
      <header class="viking-story-header">
        <span class="viking-label">Core components</span>
        <h2 class="viking-heading-md">Polished Web Component matrix</h2>
        <p class="viking-text-muted">
          The release Storybook covers the interactive primitives used by non-Angular consumers,
          while Angular wrappers stay exported from the package root and <code>/angular</code>.
        </p>
      </header>

      <div class="viking-story-grid cols-3">
        <viking-card compact>
          <span class="viking-label">Buttons</span>
          <div class="viking-story-row viking-story-footer-space">
            <viking-button variant="primary"><viking-icon name="shield" size="16"></viking-icon>Launch</viking-button>
            <viking-button variant="secondary" loading>Syncing</viking-button>
            <viking-button variant="outline"><viking-icon name="chevron-right" size="16"></viking-icon></viking-button>
          </div>
        </viking-card>

        <viking-card compact>
          <span class="viking-label">Forms</span>
          <div class="viking-story-grid">
            <viking-field label="Mission ID" description="Tokenized field stack" required>
              <viking-input placeholder="DEML-2049" clearable></viking-input>
            </viking-field>
            <viking-select label="Retention window" value="30d">
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
              <option value="90d">90 days</option>
            </viking-select>
          </div>
        </viking-card>

        <viking-card compact>
          <span class="viking-label">Feedback</span>
          <div class="viking-story-grid">
            <div class="viking-story-row">
              <viking-badge tone="success" icon="check">Healthy</viking-badge>
              <viking-badge tone="danger" icon="alert-triangle">Guarded</viking-badge>
            </div>
            <viking-callout tone="warning" heading="Review drift">
              Token drift requires approval before the next publish.
            </viking-callout>
          </div>
        </viking-card>

        <viking-card compact>
          <span class="viking-label">Overlay</span>
          <p class="viking-text-muted">
            Modal and command palette states are captured in their focused stories to keep the
            release matrix scannable.
          </p>
          <viking-modal title="Confirm deployment" dismissible>
            Confirm the release after visual baselines pass.
            <viking-button slot="actions" variant="ghost">Cancel</viking-button>
            <viking-button slot="actions" variant="primary">Deploy</viking-button>
          </viking-modal>
        </viking-card>

        <viking-card compact>
          <span class="viking-label">Navigation</span>
          <viking-suite-header
            context="docs"
            app-url="https://deml.app"
            marketing-url="https://dataengineeringformachinelearning.com"
            backend-url="https://backend.deml.app"
          ></viking-suite-header>
        </viking-card>

        <viking-card compact>
          <span class="viking-label">Theme</span>
          <div class="viking-story-row viking-story-footer-space">
            <viking-theme-toggle-wc aria-label="Switch theme"></viking-theme-toggle-wc>
            <viking-suite-command-palette context="docs"></viking-suite-command-palette>
          </div>
        </viking-card>
      </div>
    </div>
  </div>
`;

const meta: Meta = {
  title: "Viking Web Components/Release/Publishing",
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

export const PublishingReadiness: Story = {
  render: renderPublishingReadiness,
};

export const CoreComponentMatrix: Story = {
  render: renderCoreMatrix,
};
