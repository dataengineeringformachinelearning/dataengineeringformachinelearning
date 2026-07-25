import type { Meta, StoryObj } from "@storybook/html";

type ModalArgs = {
  title: string;
  open: boolean;
  dismissible: boolean;
};

const renderModal = ({ title, open, dismissible }: ModalArgs) => `
  <div class="viking-story-panel">
    <viking-button-wc id="open-modal" variant="secondary">Review policy change</viking-button-wc>
    <viking-modal-wc
      ${open ? "open" : ""}
      title="${title}"
      dismissible="${dismissible ? "true" : "false"}"
    >
      <p>The deployment will roll a new worker stack to production.</p>
      <p>Proceed only during a low-traffic maintenance window.</p>
      <viking-button-wc slot="actions" variant="secondary">Cancel</viking-button-wc>
      <viking-button-wc slot="actions" variant="primary">Deploy</viking-button-wc>
    </viking-modal-wc>
  </div>
`;

const meta: Meta<typeof renderModal> = {
  title: "Primitives/Dialog",
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
