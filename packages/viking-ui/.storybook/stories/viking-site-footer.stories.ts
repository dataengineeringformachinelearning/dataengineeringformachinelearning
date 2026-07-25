import type { Meta, StoryObj } from "@storybook/html";

type FooterArgs = {
  context: string;
  authenticated: boolean;
};

const renderFooter = ({ context, authenticated }: FooterArgs) => `
  <div class="viking-story-panel viking-story-bleed">
    <viking-site-footer
      context="${context}"
      ${authenticated ? "authenticated" : ""}
      app-url="https://deml.app"
      marketing-url="https://dataengineeringformachinelearning.com"
      backend-url="https://backend.deml.app"
    ></viking-site-footer>
  </div>
`;

const meta: Meta<typeof renderFooter> = {
  title: "Viking Web Components/Navigation/VikingSiteFooter",
  tags: ["autodocs"],
  render: renderFooter,
  argTypes: {
    context: {
      control: "select",
      options: ["marketing", "app", "backend", "docs"],
    },
    authenticated: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof renderFooter>;

export const Marketing: Story = {
  args: {
    context: "marketing",
    authenticated: false,
  },
};

export const AppAuthenticated: Story = {
  args: {
    context: "app",
    authenticated: true,
  },
};
