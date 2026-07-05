import type { Meta, StoryObj } from "@storybook/html";

const renderModal = ({
  title,
  open,
  dismissible,
}: {
  title: string;
  open: boolean;
  dismissible: boolean;
}) => `
  <div class="viking-story-panel">
    <viking-button id="open-modal">Review policy change</viking-button>
    <viking-modal
      ${open ? "open" : ""}
      title="${title}"
      ${dismissible ? "dismissible" : "dismissible=false"}
    >
      <p>The deployment will roll a new worker stack to production.</p>
      <p>Proceed only during a low-traffic maintenance window.</p>
      <viking-button slot="actions" variant="secondary">Cancel</viking-button>
      <viking-button slot="actions" variant="primary">Deploy</viking-button>
    </viking-modal>
  </div>
`;

const meta: Meta<typeof renderModal> = {
  title: "Viking Web Components/Overlay/VikingModal",
  tags: ["autodocs"],
  render: renderModal,
  argTypes: {
    open: { control: "boolean" },
    dismissible: { control: "boolean" },
    title: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof renderModal>;

export const OpenByDefault: Story = {
  args: {
    title: "Confirm deployment",
    open: true,
    dismissible: true,
  },
};

export const LockedBackdrop: Story = {
  args: {
    title: "Critical action",
    open: true,
    dismissible: false,
  },
};
