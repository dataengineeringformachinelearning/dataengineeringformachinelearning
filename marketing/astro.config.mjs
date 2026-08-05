// @ts-check
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://dataengineeringformachinelearning.com/",
  integrations: [
    sitemap({
      // Domain-pure sitemap per PASS 5: only canonical marketing pages; exclude login (redirects to app auth).
      filter: (page) => !page.endsWith("/login"),
    }),
  ],
  vite: {
    // Same names as backend/frontend (FRONTEND_URL, BACKEND_URL, MARKETING_URL).
    envPrefix: ["PUBLIC_", "FRONTEND_", "BACKEND_", "MARKETING_"],
  },
});
