// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { fileURLToPath } from "node:url";

const vikingUiDist = (file) =>
  fileURLToPath(new URL(`../packages/viking-ui/dist/${file}`, import.meta.url));

// https://astro.build/config
export default defineConfig({
  site: "https://dataengineeringformachinelearning.com/",
  integrations: [
    sitemap({
      // Domain-pure sitemap per PASS 5: only canonical marketing pages; exclude login (redirects to app auth).
      // Cursor - Grok 4.3 (2026-07-01)
      filter: (page) => !page.endsWith("/login"),
    }),
  ],
  vite: {
    // Same names as backend/frontend (FRONTEND_URL, BACKEND_URL, MARKETING_URL). Env-driven, no Railway hardcodes.
    // Cursor - Grok 4.3
    envPrefix: ["PUBLIC_", "FRONTEND_", "BACKEND_", "MARKETING_"],
    resolve: {
      alias: {
        "@dataengineeringformachinelearning/viking-ui/icons":
          vikingUiDist("icons.js"),
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
});
