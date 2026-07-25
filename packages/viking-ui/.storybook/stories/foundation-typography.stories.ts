import type { Meta, StoryObj } from "@storybook/html";

const render = () => `
  <div class="suite-story-panel viking-story-panel suite-story-narrow suite-story-stack">
    <p class="suite-story-kicker">Foundation · Typography</p>
    <h1 style="font-size:var(--suite-text-display);letter-spacing:var(--suite-tracking-brand);text-transform:uppercase">DEML</h1>
    <h2 style="font-size:var(--suite-text-2xl)">Operate with command density</h2>
    <p style="font-size:var(--suite-text-lg);color:var(--suite-ink-muted);line-height:var(--suite-leading-normal)">
      Body lede uses suite readable measure and muted ink — identical on FORJD docs.
    </p>
    <p style="font-family:var(--suite-font-mono);font-size:var(--suite-text-sm);letter-spacing:var(--suite-tracking-caps);text-transform:uppercase;color:var(--suite-ink-muted)">
      Section tag · mono caps
    </p>
  </div>
`;

const meta: Meta = {
  title: "Foundation/Typography",
  tags: ["autodocs"],
  render,
};

export default meta;
type Story = StoryObj;

export const Scale: Story = {};
