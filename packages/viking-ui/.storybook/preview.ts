import { registerVikingElements } from "../src/web/index";
import type { Preview } from "@storybook/html";

import "../dist/suite-fonts.css";
import "../dist/suite-tokens.css";
import "../dist/suite-components.css";
import "../dist/design-tokens.css";
import "../dist/viking-ui.css";
import "./storybook.css";

registerVikingElements();

const wrapStory = (storyMarkup: unknown): string | Node => {
  if (typeof storyMarkup === "string") {
    return `<div class="suite-story-shell viking-story-shell" data-theme="dark">${storyMarkup}</div>`;
  }
  if (storyMarkup instanceof Node) {
    const shell = document.createElement("div");
    shell.className = "suite-story-shell viking-story-shell";
    shell.setAttribute("data-theme", "dark");
    shell.appendChild(storyMarkup);
    return shell;
  }
  return `<div class="suite-story-shell viking-story-shell" data-theme="dark"></div>`;
};

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
          "Foundation",
          "Primitives",
          "Product",
          "Product/Controls",
          "Product/Status",
          "Product/Layout",
          "Product/Surfaces",
          "Product/Navigation",
          "Product/Overlay",
          "Product/Playground",
          "Product/Release",
        ],
      },
    },
    a11y: {
      test: "todo",
    },
    docs: {
      story: {
        inline: false,
      },
    },
    layout: "fullscreen",
    backgrounds: {
      default: "void",
      values: [
        { name: "void", value: "var(--suite-bg)" },
        { name: "surface", value: "var(--suite-surface)" },
        { name: "elevated", value: "var(--suite-surface-elevated)" },
      ],
    },
    chromatic: {
      viewports: [375, 768, 1280],
    },
  },
  tags: ["autodocs"],
  decorators: [
    (story) => {
      try {
        return wrapStory(story());
      } catch (error) {
        console.error("[viking-storybook] story render failed", error);
        return `<div class="suite-story-shell viking-story-shell" data-theme="dark">
          <div class="suite-story-panel viking-story-panel">
            <viking-callout tone="danger" heading="Story failed to render">
              Check the browser console for the component error.
            </viking-callout>
          </div>
        </div>`;
      }
    },
  ],
};

export default preview;
