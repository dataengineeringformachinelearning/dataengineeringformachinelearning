import { registerVikingElements } from "../src/web/index";
import type { Preview } from "@storybook/html";
import "../dist/design-tokens.css";
import "../dist/viking-ui.css";
import "./storybook.css";

registerVikingElements();

const preview: Preview = {
  parameters: {
    controls: {
      expanded: true,
      sort: "requiredFirst",
    },
    actions: {
      handles: [
        "viking-press",
        "viking-change",
        "viking-select",
        "viking-query",
        "viking-close",
        "viking-theme-change",
      ],
    },
    a11y: {
      test: "default",
    },
    docs: {
      story: {
        inline: false,
      },
    },
    layout: "fullscreen",
    backgrounds: {
      default: "battlefield-dark",
      values: [
        { name: "battlefield-dark", value: "var(--viking-charcoal-900)" },
        { name: "command-light", value: "var(--viking-slate-050)" },
        { name: "obsidian-deep", value: "var(--viking-navy-1000)" },
      ],
    },
  },
  tags: ["autodocs"],
  decorators: [
    (story) => {
      const storyMarkup = story();
      return `<div class="viking-story-shell viking-battlefield-shell" data-theme="dark">${storyMarkup}</div>`;
    },
  ],
};

export default preview;
