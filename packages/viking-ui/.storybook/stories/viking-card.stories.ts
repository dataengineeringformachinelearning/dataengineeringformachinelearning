import type { Meta, StoryObj } from "@storybook/html";

const renderCard = ({
  title,
  compact,
  interactive,
  heading,
  metric,
}: {
  title: string;
  compact: boolean;
  interactive: boolean;
  heading: string;
  metric: string;
}) => `
  <div class="viking-story-grid cols-2">
    <viking-card ${compact ? "compact" : ""} ${
      interactive ? "interactive" : ""
    } title="${title}">
      <div class="viking-card-header">
        <h3>${heading}</h3>
      </div>
      <p class="viking-text-muted">${metric}</p>
      <p>High-fidelity UI primitives and design tokens keep this card consistent across Angular, Astro, and static surfaces.</p>
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
    title: { control: "text" },
    heading: { control: "text" },
    metric: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof renderCard>;

export const Default: Story = {
  args: {
    title: "Events per second",
    compact: false,
    interactive: true,
    heading: "Events per second",
    metric: "8.4K sustained ingest throughput.",
  },
};

export const Compact: Story = {
  args: {
    title: "SLO compliance",
    compact: true,
    interactive: false,
    heading: "SLO compliance",
    metric: "99.92% availability across last 24h.",
  },
};
