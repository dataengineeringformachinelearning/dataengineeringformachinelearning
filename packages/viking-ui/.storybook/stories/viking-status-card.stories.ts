import type { Meta, StoryObj } from "@storybook/html";

type StatusCardArgs = {
  title: string;
  subtitle: string;
  status: string;
  statusTone: string;
  compact: boolean;
  loading: boolean;
};

const renderCard = ({
  title,
  subtitle,
  status,
  statusTone,
  compact,
  loading,
}: StatusCardArgs) => `
  <div class="viking-story-panel viking-story-narrow">
    <viking-status-card
      title="${title}"
      subtitle="${subtitle}"
      status="${status}"
      status-tone="${statusTone}"
      status-dot
      ${compact ? "compact" : ""}
      ${loading ? "loading" : ""}
    ></viking-status-card>
  </div>
`;

const meta: Meta<typeof renderCard> = {
  title: "Product/Status/StatusCard",
  tags: ["autodocs"],
  render: renderCard,
  argTypes: {
    statusTone: {
      control: "select",
      options: [
        "accent",
        "secondary",
        "success",
        "warning",
        "danger",
        "info",
        "muted",
      ],
    },
    compact: { control: "boolean" },
    loading: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof renderCard>;

export const Operational: Story = {
  args: {
    title: "api.deml.app",
    subtitle: "Edge control plane · us-east-1",
    status: "Operational",
    statusTone: "success",
    compact: false,
    loading: false,
  },
};

export const Degraded: Story = {
  args: {
    title: "Ingest lane",
    subtitle: "Elevated latency on sealed batch path",
    status: "Degraded",
    statusTone: "warning",
    compact: false,
    loading: false,
  },
};

export const Compact: Story = {
  args: {
    title: "Tenant0",
    subtitle: "Platform projection",
    status: "Live",
    statusTone: "accent",
    compact: true,
    loading: false,
  },
};

export const Loading: Story = {
  args: {
    title: "Status page",
    subtitle: "Hydrating probes",
    status: "…",
    statusTone: "muted",
    compact: false,
    loading: true,
  },
};
