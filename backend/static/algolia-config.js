// Algolia Experiences config (search-only key — safe for client-side autocomplete).
// Override locally for dev; production values match marketing site-env defaults.
//
// Crawler / indexing: mirror these sitemap URLs in the Algolia dashboard crawler so
// results link across deml.app, marketing, and backend surfaces.
window.ALGOLIA_CONFIG = window.ALGOLIA_CONFIG || {
  appId: "ZJAFYOSH2V",
  // nosemgrep: generic.secrets.security.detected-generic-api-key.detected-generic-api-key
  apiKey: "7c9de08d7f553ba6c60441c1324c105d", // pragma: allowlist secret
  experienceId: "ZJAFYOSH2V",
  env: "prod",
  domains: [
    "https://deml.app",
    "https://dataengineeringformachinelearning.com",
    "https://backend.deml.app",
  ],
  sitemaps: [
    "https://deml.app/sitemap.xml",
    "https://deml.app/sitemap-index.xml",
    "https://dataengineeringformachinelearning.com/sitemap-index.xml",
    "https://backend.deml.app/sitemap.xml",
  ],
};
