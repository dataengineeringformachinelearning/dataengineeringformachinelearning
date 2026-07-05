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
      default: "surface-shell",
      values: [
        { name: "surface-shell", value: "#0d1017" },
        { name: "chalk", value: "#f5f5f2" },
        { name: "obsidian", value: "#05070d" },
      ],
    },
  },
  tags: ["autodocs"],
  decorators: [
    (story) => {
      const storyMarkup = story();
      return `<div class="viking-story-shell">${storyMarkup}</div>`;
    },
  ],
};

export default preview;
