import type { Meta, StoryObj } from "@storybook/html";

const renderButton = ({
  label,
  variant,
  size,
  loading,
  disabled,
  square,
  fullWidth,
  icon,
  iconTrailing,
  ariaBusy,
}: {
  label: string;
  variant: string;
  size: string;
  loading: boolean;
  disabled: boolean;
  square: boolean;
  fullWidth: boolean;
  icon: string;
  iconTrailing: string;
  ariaBusy: boolean;
}) => `
  <div class="viking-story-panel">
    <div class="viking-story-row">
      <viking-button
        variant="${variant}"
        ${size ? `size="${size}"` : ""}
        ${loading ? "loading" : ""}
        ${disabled ? "disabled" : ""}
        ${square ? "square" : ""}
        ${fullWidth ? "full-width" : ""}
        ${ariaBusy ? 'aria-busy="true"' : ""}
      >
      ${icon ? `<viking-icon name="${icon}" size="16"></viking-icon>` : ""}
      ${label}
      ${iconTrailing ? `<viking-icon name="${iconTrailing}" size="16"></viking-icon>` : ""}
      </viking-button>
    </div>
  </div>
`;

const meta: Meta<typeof renderButton> = {
  title: "Viking Web Components/Controls/VikingButton",
  tags: ["autodocs"],
  render: renderButton,
  argTypes: {
    variant: {
      control: "select",
      options: [
        "outline",
        "primary",
        "secondary",
        "filled",
        "danger",
        "ghost",
        "subtle",
      ],
    },
    size: { control: "select", options: ["", "sm", "xs"] },
    loading: { control: "boolean" },
    disabled: { control: "boolean" },
    square: { control: "boolean" },
    fullWidth: { control: "boolean" },
    label: { control: "text" },
    icon: {
      control: "select",
      options: [
        "",
        "shield",
        "sparkle",
        "chevron-right",
        "check",
        "alert-triangle",
        "lock",
      ],
    },
    iconTrailing: {
      control: "select",
      options: [
        "",
        "chevron-right",
        "sparkle",
        "shield",
        "check",
        "rocket",
        "lock",
      ],
    },
    ariaBusy: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof renderButton>;

export const Primary: Story = {
  args: {
    label: "Launch Drift Scanner",
    variant: "primary",
    size: "",
    loading: false,
    disabled: false,
    square: false,
    fullWidth: false,
    icon: "",
    iconTrailing: "",
    ariaBusy: false,
  },
};

export const AccentCompact: Story = {
  args: {
    label: "View Details",
    variant: "ghost",
    size: "sm",
    loading: false,
    disabled: false,
    square: false,
    fullWidth: false,
    icon: "",
    iconTrailing: "",
    ariaBusy: false,
  },
};

export const Premium: Story = {
  args: {
    label: "Primary Command",
    variant: "filled",
    size: "",
    loading: false,
    disabled: false,
    square: false,
    fullWidth: true,
    icon: "",
    iconTrailing: "",
    ariaBusy: false,
  },
};

export const IconLeading: Story = {
  args: {
    label: "Launch Drift Scanner",
    variant: "primary",
    size: "",
    loading: false,
    disabled: false,
    square: false,
    fullWidth: false,
    icon: "shield",
    iconTrailing: "",
    ariaBusy: false,
  },
};

export const IconAndLabelBalance: Story = {
  args: {
    label: "Open Incident Log",
    variant: "subtle",
    size: "",
    loading: false,
    disabled: false,
    square: false,
    fullWidth: false,
    icon: "sparkle",
    iconTrailing: "chevron-right",
    ariaBusy: false,
  },
};

export const LoadingState: Story = {
  args: {
    label: "Reconciling telemetry",
    variant: "secondary",
    size: "",
    loading: true,
    disabled: false,
    square: false,
    fullWidth: false,
    icon: "",
    iconTrailing: "",
    ariaBusy: false,
  },
};
