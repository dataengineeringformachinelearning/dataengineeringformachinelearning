import type { Meta, StoryObj } from "@storybook/html";

/** Static suite chrome — matches forjd-ui Primitives/Forms for Chromatic parity. */
const render = () => `
  <div class="suite-story-panel viking-story-panel suite-story-narrow suite-story-stack">
    <p class="suite-story-kicker">Primitives · Forms</p>
    <label class="suite-field viking-field fj-field">
      <span class="suite-label">Email</span>
      <input class="suite-input viking-input fj-input" type="email" placeholder="ops@deml.app" />
    </label>
    <label class="suite-field">
      <span class="suite-label">Mode</span>
      <select class="suite-select fj-select">
        <option value="" disabled selected>Choose…</option>
        <option>Streaming</option>
        <option>Batch</option>
      </select>
    </label>
    <label class="suite-field">
      <span class="suite-label">Notes</span>
      <textarea class="suite-textarea fj-textarea" rows="3" placeholder="Owned styles only"></textarea>
    </label>
    <label class="suite-checkbox fj-checkbox">
      <input type="checkbox" checked />
      <span>Enable sealed lane</span>
    </label>
    <label class="suite-switch fj-switch">
      <input type="checkbox" role="switch" checked />
      <span class="suite-switch-track fj-switch-track" aria-hidden="true"></span>
      <span>Live updates</span>
    </label>
  </div>
`;

const meta: Meta = {
  title: "Primitives/Forms",
  tags: ["autodocs"],
  render,
};

export default meta;
type Story = StoryObj;

export const Stack: Story = {};
