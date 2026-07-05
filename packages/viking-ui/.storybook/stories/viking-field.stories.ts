import type { Meta, StoryObj } from "@storybook/html";

const renderField = ({
  label,
  description,
  error,
  required,
}: {
  label: string;
  description: string;
  error: string;
  required: boolean;
}) => `
  <div class="viking-story-panel">
    <viking-field
      label="${label}"
      description="${description}"
      ${error ? `error="${error}"` : ""}
      ${required ? "required" : ""}
      width="full"
    >
      <viking-input placeholder="user@company.io" name="email"></viking-input>
    </viking-field>
  </div>
`;

const meta: Meta<typeof renderField> = {
  title: "Viking Web Components/Forms/VikingField",
  tags: ["autodocs"],
  render: renderField,
  argTypes: {
    label: { control: "text" },
    description: { control: "text" },
    error: { control: "text" },
    required: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof renderField>;

export const Default: Story = {
  args: {
    label: "Contact email",
    description: "Used for incident follow-ups and account notices.",
    error: "",
    required: true,
  },
};

export const Invalid: Story = {
  args: {
    label: "Contact email",
    description: "Used for incident follow-ups and account notices.",
    error: "That email is not valid.",
    required: true,
  },
};
