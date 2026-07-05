import type { Meta, StoryObj } from "@storybook/html";

const renderThemeToggle = ({ compact }: { compact: boolean }) => `
  <div class="viking-story-panel">
    <div class="viking-story-row">
      <viking-theme-toggle-wc
        aria-label="Switch theme"
        ${compact ? 'style="transform: scale(0.95)"' : ""}
      ></viking-theme-toggle-wc>
    </div>
    <p class="viking-text-muted">The component persists theme preference in local storage and emits viking-theme-change.</p>
  </div>
`;

const meta: Meta<typeof renderThemeToggle> = {
  title: "Viking Web Components/Controls/VikingThemeToggle",
  tags: ["autodocs"],
  render: renderThemeToggle,
  argTypes: {
    compact: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof renderThemeToggle>;

export const Default: Story = {
  args: {
    compact: false,
  },
};
