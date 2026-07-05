import type { Meta, StoryObj } from "@storybook/html";

const renderCallout = ({
  tone,
  heading,
  dismissible,
}: {
  tone: string;
  heading: string;
  dismissible: boolean;
}) => `
  <div class="viking-story-panel">
    <viking-callout tone="${tone}" heading="${heading}" ${
      dismissible ? "dismissible" : ""
    }>
      A premium design signal keeps the interface resilient while preserving operational contrast.
    </viking-callout>
  </div>
`;

const meta: Meta<typeof renderCallout> = {
  title: "Viking Web Components/Feedback/VikingCallout",
  tags: ["autodocs"],
  render: renderCallout,
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
    heading: { control: "text" },
    dismissible: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof renderCallout>;

export const Default: Story = {
  args: {
    tone: "warning",
    heading: "Latency elevated",
    dismissible: true,
  },
};
