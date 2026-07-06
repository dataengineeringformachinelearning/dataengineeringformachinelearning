// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { fileURLToPath } from "node:url";

const vikingUiDist = (file) =>
  fileURLToPath(new URL(`../packages/viking-ui/dist/${file}`, import.meta.url));

export default defineConfig({
  site: "https://ui.dataengineeringformachinelearning.com/",
  integrations: [sitemap()],
  vite: {
    envPrefix: ["PUBLIC_"],
    resolve: {
      alias: {
        "@dataengineeringformachinelearning/viking-ui/icons":
          vikingUiDist("icons.js"),
        "@dataengineeringformachinelearning/viking-ui/viking-ui.css":
          vikingUiDist("viking-ui.css"),
        "@dataengineeringformachinelearning/viking-ui/web-components.js":
          vikingUiDist("web-components.js"),
        "@dataengineeringformachinelearning/viking-ui/viking-ui-elements.js":
          vikingUiDist("viking-ui-elements.js"),
        "@dataengineeringformachinelearning/viking-ui/site-drakkar":
          vikingUiDist("site-drakkar.js"),
        "@dataengineeringformachinelearning/viking-ui/manifest": vikingUiDist(
          "viking.manifest.json",
        ),
        "@dataengineeringformachinelearning/viking-ui/tokens.json":
          vikingUiDist("viking-tokens.json"),
      },
    },
  },
  build: {
    inlineStylesheets: "auto",
  },
});
