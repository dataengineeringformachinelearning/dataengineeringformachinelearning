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
    options: {
      storySort: {
        method: "alphabetical",
        order: [
          "Viking Web Components",
          "Viking Web Components/Playground",
          "Viking Web Components/Controls",
          "Viking Web Components/Navigation",
          "Viking Web Components/Layout",
          "Viking Web Components/Forms",
          "Viking Web Components/Feedback",
          "Viking Web Components/Overlay",
        ],
      },
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
      default: "battlefield-surface",
      values: [
        {
          name: "battlefield-surface",
          value:
            "linear-gradient(180deg, #05070d 0%, #0a0d16 80%, #05070d 100%)",
        },
        { name: "viking-charcoal", value: "#080b12" },
        { name: "viking-glass", value: "#10131b" },
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
