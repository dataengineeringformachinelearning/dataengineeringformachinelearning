import type { Meta, StoryObj } from "@storybook/html";

const renderCard = ({
  title,
  compact,
  interactive,
  loading,
  heading,
  metric,
  detail,
  showFooter,
  footerLabel,
}: {
  title: string;
  compact: boolean;
  interactive: boolean;
  loading: boolean;
  heading: string;
  metric: string;
  detail: string;
  showFooter: boolean;
  footerLabel: string;
}) => `
  <div class="viking-story-grid cols-2">
    <viking-card ${compact ? "compact" : ""} ${interactive ? "interactive" : ""} ${
      loading ? "loading" : ""
    } title="${title}">
      <div class="viking-card-header">
        <h3>${heading}</h3>
        <viking-badge tone="accent" icon="shield">Signal</viking-badge>
      </div>
      <p class="viking-text-muted">${metric}</p>
      <p>${detail}</p>
      ${showFooter ? `<div class="viking-card-footer"><viking-button size="sm" variant="ghost">${footerLabel}</viking-button></div>` : ""}
    </viking-card>
  </div>
`;

const meta: Meta<typeof renderCard> = {
  title: "Viking Web Components/Layout/VikingCard",
  tags: ["autodocs"],
  render: renderCard,
  argTypes: {
    compact: { control: "boolean" },
    interactive: { control: "boolean" },
    loading: { control: "boolean" },
    title: { control: "text" },
    heading: { control: "text" },
    metric: { control: "text" },
    detail: { control: "text" },
    showFooter: { control: "boolean" },
    footerLabel: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof renderCard>;

export const Default: Story = {
  args: {
    title: "Events per second",
    compact: false,
    interactive: true,
    loading: false,
    heading: "Events per second",
    metric: "8.4K sustained ingest throughput.",
    detail:
      "High-fidelity UI primitives and design tokens keep this card consistent across Angular, Astro, and static surfaces.",
    showFooter: false,
    footerLabel: "Open signal detail",
  },
};

export const Compact: Story = {
  args: {
    title: "SLO compliance",
    compact: true,
    interactive: false,
    loading: false,
    heading: "SLO compliance",
    metric: "99.92% availability across last 24h.",
    detail:
      "Monitoring integrity and release confidence across the full event stream.",
    showFooter: true,
    footerLabel: "Review SLO",
  },
};

export const LoadingState: Story = {
  args: {
    title: "Forecast model",
    compact: false,
    interactive: false,
    loading: true,
    heading: "Forecast model",
    metric: "Model artifact sync pending.",
    detail:
      "This card demonstrates the loading state while pipeline snapshots refresh.",
    showFooter: false,
    footerLabel: "Open artifact",
  },
};

export const EqualHeightGrid: Story = {
  args: Default.args,
  render: () => `
    <div class="viking-grid viking-grid--2 viking-grid--equal-rows">
      <viking-card title="Compact signal">
        <div class="viking-card-header">
          <h3>Compact signal</h3>
          <viking-badge tone="success">Stable</viking-badge>
        </div>
        <p>A concise status summary.</p>
        <div class="viking-card-footer">
          <viking-button size="sm" variant="ghost">Open signal</viking-button>
        </div>
      </viking-card>
      <viking-card title="Detailed signal">
        <div class="viking-card-header">
          <h3>Detailed signal</h3>
          <viking-badge tone="accent">Live</viking-badge>
        </div>
        <p class="viking-text-muted">8.4K sustained events per second.</p>
        <p>
          This intentionally longer card verifies that cards with different
          content lengths fill the same grid track without fixed heights.
        </p>
        <div class="viking-card-footer">
          <viking-button size="sm" variant="ghost">Open telemetry</viking-button>
        </div>
      </viking-card>
    </div>
  `,
};
