// Algolia Experiences + multi-index page search (search-only key — safe client-side).
// Suite command palette queries these indexes live and navigates via hit.url.
//
// Crawler / indexing: keep sitemaps in the Algolia dashboard so app, marketing,
// backend, and UI docs stay searchable after each deploy (Recrawl).
window.ALGOLIA_CONFIG = window.ALGOLIA_CONFIG || {
  appId: 'ZJAFYOSH2V',
  // nosemgrep: generic.secrets.security.detected-generic-api-key.detected-generic-api-key
  apiKey: '7c9de08d7f553ba6c60441c1324c105d', // pragma: allowlist secret
  experienceId: 'ZJAFYOSH2V',
  env: 'prod',
  indexNames: [
    'dataengineeringformachinelearning_com_zjafyosh2v_pages',
    'deml_app_pages',
    'deml_backend_pages',
    'DEML UI',
  ],
  domains: [
    'https://deml.app',
    'https://dataengineeringformachinelearning.com',
    'https://backend.deml.app',
    'https://ui.dataengineeringformachinelearning.com',
  ],
  sitemaps: [
    'https://deml.app/sitemap.xml',
    'https://deml.app/sitemap-index.xml',
    'https://dataengineeringformachinelearning.com/sitemap-index.xml',
    'https://backend.deml.app/sitemap.xml',
    'https://ui.dataengineeringformachinelearning.com/sitemap.xml',
  ],
};
