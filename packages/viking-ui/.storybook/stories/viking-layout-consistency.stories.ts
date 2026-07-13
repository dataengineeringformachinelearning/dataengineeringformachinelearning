import type { Meta, StoryObj } from "@storybook/html";

const renderConsistency = () => `
  <main class="viking-content-layout viking-content-layout--dashboard viking-content-layout--wide viking-content-layout--compact">
    <div class="viking-content-layout__inner">
      <header class="viking-content-layout__header">
        <div class="viking-content-layout__heading viking-stack viking-stack--tight">
          <span class="viking-label">Tenant0 operations</span>
          <h1 class="viking-heading">Projection control plane</h1>
          <p class="viking-text-muted">The same shell, section, metric, and field rhythm used by dashboards, documentation, and marketing.</p>
        </div>
        <div class="viking-content-layout__actions">
          <viking-button variant="outline">Export evidence</viking-button>
          <viking-button variant="primary">Create monitor</viking-button>
        </div>
      </header>

      <div class="viking-content-layout__body">
        <section class="viking-section-template" aria-labelledby="consistency-metrics">
          <header class="viking-section__header">
            <div class="viking-section__heading-group">
              <h2 id="consistency-metrics" class="viking-section__title">Operational summary</h2>
              <p class="viking-section__description">Dense information stays in a maximum of two equal columns.</p>
            </div>
          </header>
          <div class="viking-metric-row viking-metric-row--auto viking-metric-row--default">
            <article class="viking-story-metric viking-box viking-box--muted viking-box--padding-default"><span class="viking-label">Delivery</span><strong>99.99%</strong><span class="viking-text-muted">Within SLO</span></article>
            <article class="viking-story-metric viking-box viking-box--muted viking-box--padding-default"><span class="viking-label">Projection lag</span><strong>42 ms</strong><span class="viking-text-muted">All tenants</span></article>
          </div>
        </section>

        <section class="viking-section-template" aria-labelledby="consistency-form">
          <header class="viking-section__header">
            <div class="viking-section__heading-group">
              <h2 id="consistency-form" class="viking-section__title">Monitor configuration</h2>
              <p class="viking-section__description">Field groups share one intrinsic responsive contract.</p>
            </div>
          </header>
          <div class="viking-column-layout viking-form-grid viking-column-layout--2">
            <viking-field label="Monitor name" description="A descriptive label visible to operators"><viking-input value="Projection freshness"></viking-input></viking-field>
            <viking-field label="Environment"><viking-select value="production"></viking-select></viking-field>
          </div>
        </section>
      </div>
    </div>
  </main>
`;

const meta: Meta<typeof renderConsistency> = {
  title: "Viking Web Components/Layout/ConsistencyBaseline",
  tags: ["autodocs"],
  render: renderConsistency,
  parameters: {
    chromatic: { viewports: [390, 768, 1440] },
    docs: {
      description: {
        component:
          "Chromatic baseline for the shared page, section, metric, action, and form-field rhythm across every Viking-UI surface.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof renderConsistency>;

export const SaaSLayoutBaseline: Story = {
  decorators: [
    (story) => {
      document.documentElement.dataset["theme"] = "dark";
      return story();
    },
  ],
};

export const LightThemeBaseline: Story = {
  decorators: [
    (story) => {
      document.documentElement.dataset["theme"] = "light";
      return story();
    },
  ],
};
