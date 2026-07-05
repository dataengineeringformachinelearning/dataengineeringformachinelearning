import type { Meta, StoryObj } from "@storybook/html";

const renderSuiteHeader = ({
  context,
  authenticated,
}: {
  context: string;
  authenticated: boolean;
}) => `
  <div class="viking-story-panel">
    <viking-suite-header
      context="${context}"
      app-url="https://deml.app"
      marketing-url="https://dataengineeringformachinelearning.com"
      backend-url="https://backend.deml.app"
      ${authenticated ? "authenticated" : ""}
      user-name="Maya Reyes"
      user-email="maya@deml.example"
    ></viking-suite-header>
    <p class="viking-text-muted" style="margin-top: 1rem;">Authenticated navigation surfaces now show the user menu and dashboard actions.</p>
  </div>
`;

const meta: Meta<typeof renderSuiteHeader> = {
  title: "Viking Web Components/Navigation/VikingSuiteHeader",
  tags: ["autodocs"],
  render: renderSuiteHeader,
  argTypes: {
    context: {
      control: "select",
      options: ["app", "marketing", "backend", "docs"],
    },
    authenticated: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof renderSuiteHeader>;

export const Authenticated: Story = {
  args: {
    context: "app",
    authenticated: true,
  },
};

export const Anonymous: Story = {
  args: {
    context: "marketing",
    authenticated: false,
  },
};
