import type { Meta, StoryObj } from "@storybook/html";

const swatches = [
  ["bg", "--suite-bg"],
  ["surface", "--suite-surface"],
  ["surface-2", "--suite-surface-2"],
  ["primary", "--suite-primary"],
  ["gold", "--suite-gold"],
  ["success", "--suite-success"],
  ["warning", "--suite-warning"],
  ["danger", "--suite-danger"],
  ["ink", "--suite-ink"],
  ["ink-muted", "--suite-ink-muted"],
] as const;

const render = () => `
  <div class="suite-story-panel viking-story-panel suite-story-wide">
    <p class="suite-story-kicker">Foundation · Tokens</p>
    <h2>Suite palette</h2>
    <p class="suite-story-note">Canonical --suite-* values shared with ui.forjd.co.</p>
    <div class="suite-story-grid cols-3" style="margin-top: var(--suite-space-4)">
      ${swatches
        .map(
          ([label, token]) => `
        <div class="viking-story-metric">
          <span class="suite-story-kicker">${label}</span>
          <div style="height:2.5rem;border-radius:var(--suite-radius);border:1px solid var(--suite-border);background:var(${token})"></div>
          <code style="font-family:var(--suite-font-mono);font-size:var(--suite-text-xs);color:var(--suite-ink-muted)">${token}</code>
        </div>`,
        )
        .join("")}
    </div>
  </div>
`;

const meta: Meta = {
  title: "Foundation/Tokens",
  tags: ["autodocs"],
  render,
};

export default meta;
type Story = StoryObj;

export const Palette: Story = {};
