import type { Meta, StoryObj } from "@storybook/html";

const dialogRender = () => `
  <div class="suite-story-panel viking-story-panel suite-story-narrow suite-story-stack">
    <p class="suite-story-kicker">Primitives · Overlay</p>
    <p class="suite-story-note">Native dialog chrome — matches forjd-ui DialogAndSheet / Toast.</p>
    <dialog class="suite-dialog fj-dialog" open>
      <header class="suite-dialog-header fj-dialog-header">
        <h2 class="suite-dialog-title">Confirm</h2>
      </header>
      <div class="suite-dialog-body">Suite dialog chrome — identical on DEML and FORJD.</div>
      <footer class="suite-dialog-footer">
        <button type="button" class="suite-btn" data-variant="ghost">Cancel</button>
        <button type="button" class="suite-btn" data-variant="primary">Confirm</button>
      </footer>
    </dialog>
  </div>
`;

const toastRender = () => `
  <div class="suite-story-panel viking-story-panel suite-story-narrow" style="min-height:12rem">
    <div class="suite-toast-host fj-toast-host" style="position:relative;inset:auto;width:100%">
      <div class="suite-toast fj-toast" data-tone="success" role="status">
        <div class="suite-toast-body">
          <p class="suite-toast-title">Sealed ingest accepted</p>
          <p class="suite-toast-description">Projection checkpoint advanced.</p>
        </div>
      </div>
    </div>
  </div>
`;

const meta: Meta = {
  title: "Primitives/Overlay",
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

export const DialogAndSheet: Story = { render: dialogRender };
export const Toast: Story = { render: toastRender };
