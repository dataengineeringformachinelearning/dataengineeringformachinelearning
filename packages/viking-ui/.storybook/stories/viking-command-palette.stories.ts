import type { Meta, StoryObj } from "@storybook/html";

const sampleItems = [
  {
    title: "Component catalog",
    snippet: "Explore full Viking-UI primitives.",
    href: "/components",
    group: "Navigation",
    keywords: ["components", "ui", "catalog"],
  },
  {
    title: "Error budgets",
    snippet: "Review reliability trends and incident context.",
    href: "/analytics/errors",
    group: "Analytics",
    keywords: ["errors", "sre", "reliability"],
  },
  {
    title: "Tenant health",
    snippet: "Open tenant diagnostics for secure operations.",
    href: "/tenants/overview",
    group: "Operations",
    keywords: ["tenant", "diagnostics", "security"],
  },
];

const renderCommandPalette = ({
  open,
  placeholder,
}: {
  open: boolean;
  placeholder: string;
}) => `
  <div class="viking-story-panel">
    <viking-button id="open-command-palette">Open command palette</viking-button>
    <viking-command-palette
      ${open ? "open" : ""}
      placeholder="${placeholder}"
      items='${JSON.stringify(sampleItems)}'
      global-shortcut
    ></viking-command-palette>
  </div>
`;

const meta: Meta<typeof renderCommandPalette> = {
  title: "Viking Web Components/Overlay/VikingCommandPalette",
  tags: ["autodocs"],
  render: renderCommandPalette,
  argTypes: {
    open: { control: "boolean" },
    placeholder: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof renderCommandPalette>;

export const Default: Story = {
  args: {
    open: true,
    placeholder: "Search docs, surfaces, and operations",
  },
};
