import type { Meta, StoryObj } from "@storybook/html";

type PillArgs = {
  label: string;
  tone: string;
  icon: string;
  compact: boolean;
  dot: boolean;
  removable: boolean;
};

const renderPill = ({
  label,
  tone,
  icon,
  compact,
  dot,
  removable,
}: PillArgs) => `
  <div class="viking-story-panel">
    <div class="viking-story-row">
      <viking-status-pill
        tone="${tone}"
        ${icon ? `icon="${icon}"` : ""}
        ${compact ? "compact" : ""}
        ${dot ? "dot" : ""}
        ${removable ? "removable" : ""}
      >${label}</viking-status-pill>
    </div>
  </div>
`;

const meta: Meta<typeof renderPill> = {
  title: "Product/Status/StatusPill",
  tags: ["autodocs"],
  render: renderPill,
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
      ],
    },
    icon: {
      control: "select",
      options: ["", "check", "shield", "alert-triangle", "sparkle"],
    },
    compact: { control: "boolean" },
    dot: { control: "boolean" },
    removable: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof renderPill>;

export const Success: Story = {
  args: {
    label: "Healthy",
    tone: "success",
    icon: "check",
    compact: false,
    dot: false,
    removable: false,
  },
};

export const WarningDot: Story = {
  args: {
    label: "Elevated",
    tone: "warning",
    icon: "",
    compact: false,
    dot: true,
    removable: false,
  },
};

export const Removable: Story = {
  args: {
    label: "us-east-1",
    tone: "accent",
    icon: "shield",
    compact: false,
    dot: false,
    removable: true,
  },
};

export const CompactMuted: Story = {
  args: {
    label: "Idle",
    tone: "muted",
    icon: "",
    compact: true,
    dot: true,
    removable: false,
  },
};
