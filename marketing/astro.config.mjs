// @ts-check
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

const vikingUiDist = (file) =>
  fileURLToPath(new URL(`../packages/viking-ui/dist/${file}`, import.meta.url));

/** Prefer monorepo dist when present; on Vercel use the published npm package. */
const useLocalVikingUi = existsSync(vikingUiDist("icons.js"));

const vikingUiAliases = useLocalVikingUi
  ? {
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
    }
  : {};

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
      alias: vikingUiAliases,
    },
  },
});
