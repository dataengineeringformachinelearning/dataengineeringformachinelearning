import type { StorybookConfig } from "@storybook/html";

const config: StorybookConfig = {
  stories: ["../.storybook/stories/**/*.stories.ts"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-a11y",
    "@chromatic-com/storybook",
  ],
  framework: {
    name: "@storybook/html",
    options: {},
  },
  staticDirs: ["../dist"],
  docs: {
    autodocs: true,
  },
};

export default config;
