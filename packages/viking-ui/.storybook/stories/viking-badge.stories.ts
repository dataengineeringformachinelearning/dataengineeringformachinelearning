import type { Meta, StoryObj } from "@storybook/html";

const renderBadge = ({
  tone,
  removable,
  icon,
  size,
}: {
  tone: string;
  removable: boolean;
  icon: string;
  size: string;
}) => `
  <div class="viking-story-panel">
    <div class="viking-story-row">
      <viking-badge ${tone ? `tone="${tone}"` : ""} ${icon ? `icon="${icon}"` : ""} ${
        removable ? "removable" : ""
      } ${size ? `size="${size}"` : ""}>
        System health ${tone}
      </viking-badge>
    </div>
    <div class="viking-story-row">
      <viking-badge tone="accent" icon="sparkle">Model drift alert</viking-badge>
      <viking-badge tone="success" icon="check">SLO satisfied</viking-badge>
      <viking-badge tone="danger" icon="alert-circle">Error threshold reached</viking-badge>
    </div>
  </div>
`;

const meta: Meta<typeof renderBadge> = {
  title: "Viking Web Components/Feedback/VikingBadge",
  tags: ["autodocs"],
  render: renderBadge,
  argTypes: {
    tone: {
      control: "select",
      options: [
        "accent",
        "secondary",
        "success",
        "warning",
        "danger",
        "info",
        "muted",
        "subtle",
      ],
    },
    removable: { control: "boolean" },
    icon: { control: "text" },
    size: { control: "select", options: ["", "sm"] },
  },
};

export default meta;
type Story = StoryObj<typeof renderBadge>;

export const Primary: Story = {
  args: {
    tone: "success",
    removable: false,
    icon: "check",
    size: "",
  },
};

export const Removable: Story = {
  args: {
    tone: "info",
    removable: true,
    icon: "info",
    size: "",
  },
};
