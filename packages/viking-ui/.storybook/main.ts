import type { StorybookConfig } from "@storybook/html-vite";

const config: StorybookConfig = {
  stories: ["./stories/**/*.stories.ts"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  core: {
    disableTelemetry: true,
  },
  framework: {
    name: "@storybook/html-vite",
    options: {},
  },
  // dist includes suite-fonts.css + /fonts/inter (build:css copies faces first).
  // Mount at both / and /assets so product fetch paths (/assets/site-drakkar.json)
  // and font URLs (/fonts/inter/…) resolve in the Storybook iframe.
  staticDirs: [{ from: "../dist", to: "/assets" }, "../dist"],
  docs: {
    autodocs: "tag",
  },
};

export default config;
