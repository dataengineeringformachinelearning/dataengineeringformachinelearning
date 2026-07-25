import type { Meta, StoryObj } from "@storybook/html";

type NavbarArgs = {
  context: string;
  authenticated: boolean;
  showSearch: boolean;
};

const renderNavbar = ({ context, authenticated, showSearch }: NavbarArgs) => `
  <div class="viking-story-panel viking-story-bleed">
    <viking-site-navbar
      context="${context}"
      ${authenticated ? "authenticated" : ""}
      show-search="${showSearch ? "true" : "false"}"
      app-url="https://deml.app"
      marketing-url="https://dataengineeringformachinelearning.com"
      backend-url="https://backend.deml.app"
    ></viking-site-navbar>
  </div>
`;

const meta: Meta<typeof renderNavbar> = {
  title: "Product/Navigation/SiteNavbar",
  tags: ["autodocs"],
  render: renderNavbar,
  argTypes: {
    context: {
      control: "select",
      options: ["marketing", "app", "backend", "docs"],
    },
    authenticated: { control: "boolean" },
    showSearch: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof renderNavbar>;

export const Marketing: Story = {
  args: {
    context: "marketing",
    authenticated: false,
    showSearch: true,
  },
};

export const AppAuthenticated: Story = {
  args: {
    context: "app",
    authenticated: true,
    showSearch: true,
  },
};

export const AppAnonymous: Story = {
  args: {
    context: "app",
    authenticated: false,
    showSearch: true,
  },
};
