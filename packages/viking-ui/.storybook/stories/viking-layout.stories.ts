import type { Meta, StoryObj } from "@storybook/html";

const renderLayout = () => `
  <section class="viking-stack viking-stack--compact" aria-labelledby="layout-story-title">
    <header class="viking-stack viking-stack--tight">
      <span class="viking-label">Intrinsic composition</span>
      <h2 id="layout-story-title" class="viking-heading">Terraced operational landscape</h2>
      <p class="viking-text-muted">
        Resize the viewport: tracks form from available space, then refine into a readable stack.
      </p>
    </header>
    <div class="viking-grid viking-panel-grid viking-grid--auto viking-grid--item-compact viking-grid--equal-rows">
      <viking-card title="Ingest health">
        <div class="viking-card-header">
          <h3>Ingest health</h3>
          <viking-badge tone="success">Stable</viking-badge>
        </div>
        <p class="viking-text-muted">8.4K events per second.</p>
        <div class="viking-card-footer">
          <viking-button size="sm" variant="ghost">Inspect</viking-button>
        </div>
      </viking-card>
      <viking-card title="Projection integrity">
        <div class="viking-card-header">
          <h3>Projection integrity</h3>
          <viking-badge tone="accent">Live</viking-badge>
        </div>
        <p class="viking-text-muted">
          Idempotent materialization is current across every tenant, including the longer
          evidence needed to verify that action rows remain aligned.
        </p>
        <div class="viking-card-footer">
          <viking-button size="sm" variant="ghost">Review evidence</viking-button>
        </div>
      </viking-card>
      <viking-card title="Threat posture">
        <div class="viking-card-header">
          <h3>Threat posture</h3>
          <viking-badge tone="warning">Observe</viking-badge>
        </div>
        <p class="viking-text-muted">Two signals require operator review.</p>
        <div class="viking-card-footer">
          <viking-button size="sm" variant="ghost">Open queue</viking-button>
        </div>
      </viking-card>
    </div>
    <div class="viking-switcher viking-switcher--compact viking-switcher--tight">
      <viking-button variant="primary">Deploy projection</viking-button>
      <viking-button variant="outline">Review runbook</viking-button>
      <viking-button variant="ghost">Export evidence</viking-button>
    </div>
  </section>
`;

const meta: Meta<typeof renderLayout> = {
  title: "Viking Web Components/Layout/IntrinsicComposition",
  tags: ["autodocs"],
  render: renderLayout,
  parameters: {
    docs: {
      description: {
        component:
          "The panel-grid recipe makes equal-height peer surfaces implicit; the switcher keeps actions readable from 320px through wide operational canvases.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof renderLayout>;

export const FluidGridAndSwitcher: Story = {};
