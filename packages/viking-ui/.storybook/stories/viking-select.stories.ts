import type { Meta, StoryObj } from "@storybook/html";

const renderSelect = ({
  label,
  value,
  placeholder,
  description,
  required,
  disabled,
  error,
}: {
  label: string;
  value: string;
  placeholder: string;
  description: string;
  required: boolean;
  disabled: boolean;
  error: string;
}) => `
  <div class="viking-story-panel">
    <viking-select
      label="${label}"
      value="${value}"
      placeholder="${placeholder}"
      description="${description}"
      ${required ? "required" : ""}
      ${disabled ? "disabled" : ""}
      ${error ? `error="${error}"` : ""}
      width="full"
    >
      <option value="7d">7 days</option>
      <option value="30d">30 days</option>
      <option value="90d">90 days</option>
      <option value="1y">1 year</option>
    </viking-select>
  </div>
`;

const meta: Meta<typeof renderSelect> = {
  title: "Viking Web Components/Forms/VikingSelect",
  tags: ["autodocs"],
  render: renderSelect,
  argTypes: {
    required: { control: "boolean" },
    disabled: { control: "boolean" },
    value: { control: "text" },
    label: { control: "text" },
    placeholder: { control: "text" },
    description: { control: "text" },
    error: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof renderSelect>;

export const Default: Story = {
  args: {
    label: "Retention window",
    value: "30d",
    placeholder: "Choose duration",
    description: "How long to keep raw telemetry events.",
    required: true,
    disabled: false,
    error: "",
  },
};

export const CompactError: Story = {
  args: {
    label: "Retention window",
    value: "",
    placeholder: "Choose duration",
    description: "",
    required: true,
    disabled: false,
    error: "This field is required",
  },
};
