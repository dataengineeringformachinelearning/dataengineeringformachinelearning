import { registerVikingElements } from "../src/web/index";
import type { Preview } from "@storybook/html";
import "../dist/design-tokens.css";
import "../dist/viking-ui.css";
import "./storybook.css";

registerVikingElements();

const wrapStory = (storyMarkup: unknown): string | Node => {
  if (typeof storyMarkup === "string") {
    return `<div class="viking-story-shell" data-theme="dark">${storyMarkup}</div>`;
  }
  if (storyMarkup instanceof Node) {
    const shell = document.createElement("div");
    shell.className = "viking-story-shell";
    shell.setAttribute("data-theme", "dark");
    shell.appendChild(storyMarkup);
    return shell;
  }
  return `<div class="viking-story-shell" data-theme="dark"></div>`;
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
          "Viking Web Components",
          "Viking Web Components/Controls",
          "Viking Web Components/Forms",
          "Viking Web Components/Feedback",
          "Viking Web Components/Status",
          "Viking Web Components/Layout",
          "Viking Web Components/Surfaces",
          "Viking Web Components/Navigation",
          "Viking Web Components/Overlay",
          "Viking Web Components/Playground",
          "Viking Web Components/Release",
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
      options: {
        battlefield: {
          name: "battlefield-surface",
          value: "var(--viking-bg)",
        },
        machined: { name: "machined-surface", value: "var(--viking-surface)" },
        raised: { name: "raised-panel", value: "var(--viking-surface-raised)" },
      },
    },
    chromatic: {
      viewports: [375, 768, 1280],
    },
  },
  initialGlobals: {
    backgrounds: { value: "battlefield" },
  },
  tags: ["autodocs"],
  decorators: [
    (story) => {
      try {
        return wrapStory(story());
      } catch (error) {
        console.error("[viking-storybook] story render failed", error);
        return `<div class="viking-story-shell" data-theme="dark">
          <div class="viking-story-panel">
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
