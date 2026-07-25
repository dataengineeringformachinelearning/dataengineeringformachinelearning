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
  // dist includes suite-fonts.css + /fonts/inter (build:css copies faces first)
  staticDirs: ["../dist"],
  docs: {
    autodocs: "tag",
  },
};

export default config;
