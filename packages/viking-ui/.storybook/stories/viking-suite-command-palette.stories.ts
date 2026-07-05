import type { Meta, StoryObj } from "@storybook/html";

const renderSuiteCommandPalette = ({
  open,
  context,
  placeholder,
  globalShortcut,
}: {
  open: boolean;
  context: string;
  placeholder: string;
  globalShortcut: boolean;
}) => `
  <div class="viking-story-panel">
    <viking-suite-command-palette
      context="${context}"
      placeholder="${placeholder}"
      ${open ? "open" : ""}
      ${globalShortcut ? "global-shortcut" : ""}
    ></viking-suite-command-palette>
  </div>
`;

const meta: Meta<typeof renderSuiteCommandPalette> = {
  title: "Viking Web Components/Navigation/VikingSuiteCommandPalette",
  tags: ["autodocs"],
  render: renderSuiteCommandPalette,
  argTypes: {
    open: { control: "boolean" },
    context: {
      control: "select",
      options: ["app", "marketing", "backend", "docs"],
    },
    placeholder: { control: "text" },
    globalShortcut: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof renderSuiteCommandPalette>;

export const MarketingContext: Story = {
  args: {
    open: true,
    context: "marketing",
    placeholder: "Search marketing routes",
    globalShortcut: true,
  },
};
