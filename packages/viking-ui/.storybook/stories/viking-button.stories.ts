import type { Meta, StoryObj } from "@storybook/html";

const renderButton = ({
  label,
  variant,
  size,
  loading,
  disabled,
  square,
  fullWidth,
}: {
  label: string;
  variant: string;
  size: string;
  loading: boolean;
  disabled: boolean;
  square: boolean;
  fullWidth: boolean;
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
      >${label}</viking-button>
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
  },
};
