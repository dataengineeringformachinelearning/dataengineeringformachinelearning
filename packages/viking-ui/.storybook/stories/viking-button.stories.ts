import type { Meta, StoryObj } from "@storybook/html";

type ButtonArgs = {
  label: string;
  variant: string;
  size: string;
  loading: boolean;
  disabled: boolean;
  square: boolean;
  fullWidth: boolean;
  href: string;
};

const renderButton = ({
  label,
  variant,
  size,
  loading,
  disabled,
  square,
  fullWidth,
  href,
}: ButtonArgs) => `
  <div class="viking-story-panel">
    <div class="viking-story-row">
      <viking-button-wc
        variant="${variant}"
        ${size ? `size="${size}"` : ""}
        ${loading ? "loading" : ""}
        ${disabled ? "disabled" : ""}
        ${square ? "square" : ""}
        ${fullWidth ? "full-width" : ""}
        ${href ? `href="${href}" target="_blank"` : ""}
      >${label}</viking-button-wc>
    </div>
  </div>
`;

const meta: Meta<typeof renderButton> = {
  title: "Primitives/Button",
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
    href: { control: "text" },
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
    href: "",
  },
};

export const Secondary: Story = {
  args: {
    label: "Secondary action",
    variant: "secondary",
    size: "",
    loading: false,
    disabled: false,
    square: false,
    fullWidth: false,
    href: "",
  },
};

export const Outline: Story = {
  args: {
    label: "Outline action",
    variant: "outline",
    size: "",
    loading: false,
    disabled: false,
    square: false,
    fullWidth: false,
    href: "",
  },
};

export const Ghost: Story = {
  args: {
    label: "View Details",
    variant: "ghost",
    size: "sm",
    loading: false,
    disabled: false,
    square: false,
    fullWidth: false,
    href: "",
  },
};

export const FilledFullWidth: Story = {
  args: {
    label: "Primary Command",
    variant: "filled",
    size: "",
    loading: false,
    disabled: false,
    square: false,
    fullWidth: true,
    href: "",
  },
};

export const Loading: Story = {
  args: {
    label: "Reconciling telemetry",
    variant: "secondary",
    size: "",
    loading: true,
    disabled: false,
    square: false,
    fullWidth: false,
    href: "",
  },
};

export const AsLink: Story = {
  args: {
    label: "Open product docs",
    variant: "primary",
    size: "",
    loading: false,
    disabled: false,
    square: false,
    fullWidth: false,
    href: "https://deml.app/",
  },
};

export const Danger: Story = {
  args: {
    label: "Revoke session",
    variant: "danger",
    size: "",
    loading: false,
    disabled: false,
    square: false,
    fullWidth: false,
    href: "",
  },
};
