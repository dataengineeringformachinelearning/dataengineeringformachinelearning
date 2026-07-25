import type { Meta, StoryObj } from "@storybook/html";

/** Composition baseline for Chromatic — not a substitute for per-component stories. */
const renderPublishingReadiness = () => `
  <div class="viking-story-panel viking-story-wide">
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
          <strong class="viking-metric">Viking-UI</strong>
          <viking-badge tone="success" icon="check">npm ready</viking-badge>
        </div>
        <div class="viking-story-metric">
          <span class="viking-label">Snapshots</span>
          <strong class="viking-metric">Chromatic</strong>
          <viking-badge tone="accent" icon="shield">Viewports</viking-badge>
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

const meta: Meta = {
  title: "Product/Release/Publishing",
  tags: ["autodocs"],
};

export default meta;

export const PublishingReadiness: StoryObj = {
  render: renderPublishingReadiness,
};
