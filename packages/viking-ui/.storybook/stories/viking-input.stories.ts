import type { Meta, StoryObj } from "@storybook/html";

const renderInput = ({
  placeholder,
  value,
  type,
  clearable,
  loading,
  required,
  disabled,
  error,
  label,
}: {
  placeholder: string;
  value: string;
  type: string;
  clearable: boolean;
  loading: boolean;
  required: boolean;
  disabled: boolean;
  error: string;
  label: string;
}) => `
  <div class="viking-story-panel">
    <div class="viking-story-grid">
      <viking-field label="${label}">
        <viking-input
          type="${type}"
          placeholder="${placeholder}"
          value="${value}"
          ${required ? "required" : ""}
          ${disabled ? "disabled" : ""}
          ${clearable ? "clearable" : ""}
          ${loading ? "loading" : ""}
          ${error ? `error="${error}"` : ""}
        ></viking-input>
      </viking-field>
    </div>
  </div>
`;

const meta: Meta<typeof renderInput> = {
  title: "Viking Web Components/Forms/VikingInput",
  tags: ["autodocs"],
  render: renderInput,
  argTypes: {
    type: {
      control: "select",
      options: ["text", "email", "password", "search", "number"],
    },
    required: { control: "boolean" },
    disabled: { control: "boolean" },
    clearable: { control: "boolean" },
    loading: { control: "boolean" },
    value: { control: "text" },
    placeholder: { control: "text" },
    label: { control: "text" },
    error: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof renderInput>;

export const Default: Story = {
  args: {
    placeholder: "Enter API token",
    value: "",
    type: "password",
    clearable: true,
    loading: false,
    required: true,
    disabled: false,
    error: "",
    label: "Secrets",
  },
};

export const ErrorState: Story = {
  args: {
    placeholder: "Search",
    value: "invalid-token",
    type: "text",
    clearable: true,
    loading: false,
    required: false,
    disabled: false,
    error: "Token format should be UUID-like",
    label: "Token",
  },
};
