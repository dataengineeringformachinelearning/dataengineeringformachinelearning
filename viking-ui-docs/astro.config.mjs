// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://ui.dataengineeringformachinelearning.com/",
  integrations: [sitemap()],
  vite: {
    envPrefix: ["PUBLIC_"],
  },
  build: {
    inlineStylesheets: "auto",
  },
});
