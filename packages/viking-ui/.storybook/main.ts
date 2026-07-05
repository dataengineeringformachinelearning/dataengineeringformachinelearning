import type { StorybookConfig } from "@storybook/html-vite";

const config: StorybookConfig = {
  stories: ["../.storybook/stories/**/*.stories.ts"],
  addons: ["@storybook/addon-essentials", "@storybook/addon-a11y"],
  core: {
    disableTelemetry: true,
  },
  framework: {
    name: "@storybook/html-vite",
    options: {},
  },
  staticDirs: ["../dist"],
  docs: {
    autodocs: "tag",
  },
};

export default config;
