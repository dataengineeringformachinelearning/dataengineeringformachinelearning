import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const readPackageFile = (...segments) =>
  readFileSync(path.join(packageDir, ...segments), "utf8");

const stylesDir = path.join(packageDir, "src", "styles");

const resolveSassModule = (fromFile, specifier) => {
  if (specifier.startsWith("sass:")) return undefined;

  const searchRoots = specifier.startsWith(".")
    ? [path.resolve(path.dirname(fromFile), specifier)]
    : [
        path.resolve(path.dirname(fromFile), specifier),
        path.resolve(stylesDir, specifier),
      ];

  for (const root of searchRoots) {
    const parsed = path.parse(root);
    for (const candidate of [
      root.endsWith(".scss") ? root : `${root}.scss`,
      path.join(parsed.dir, `_${parsed.name}.scss`),
      path.join(root, "_index.scss"),
    ]) {
      if (existsSync(candidate)) return candidate;
    }
  }

  return undefined;
};

const collectSassUseClosure = (entryFile, visited = new Set()) => {
  const normalizedEntry = path.normalize(entryFile);
  if (visited.has(normalizedEntry)) return visited;
  visited.add(normalizedEntry);

  const source = readFileSync(normalizedEntry, "utf8");
  for (const match of source.matchAll(/@use\s+["']([^"']+)["']/g)) {
    const dependency = resolveSassModule(normalizedEntry, match[1]);
    if (dependency) collectSassUseClosure(dependency, visited);
  }

  return visited;
};

test("major component categories consume the shared SaaS contracts", () => {
  const variables = readPackageFile("src", "styles", "_variables.scss");
  const forms = readPackageFile("src", "styles", "_forms.scss");
  const buttons = readPackageFile("src", "styles", "_buttons.scss");
  const table = readPackageFile("src", "lib", "table", "table.ts");
  const chart = readPackageFile("src", "lib", "chart", "chart.ts");

  assert.match(
    variables,
    /--viking-component-radius:\s*var\(--viking-radius\)/,
  );
  assert.match(variables, /--viking-component-surface-radius:/);
  assert.match(variables, /--viking-navigation-item-height:\s*40px/);
  assert.match(forms, /background:\s*var\(--viking-component-bg-inset\)/);
  assert.match(buttons, /border-radius:\s*var\(--viking-component-radius\)/);
  assert.match(table, /var\(--viking-table-cell-padding-y\)/);
  assert.match(variables, /--viking-chart-ratio:\s*2 \/ 1/);
  assert.match(variables, /--viking-chart-plot-height:\s*clamp\(/);
  assert.match(chart, /height:\s*var\(--viking-chart-plot-height\)/);
  assert.match(chart, /xMidYMid meet/);
});

test("the application bundle keeps Angular surfaces complete without static-site weight", () => {
  const applicationBundle = readPackageFile("src", "styles", "viking-app.scss");
  const applicationPages = readPackageFile(
    "src",
    "styles",
    "surfaces",
    "app-pages.scss",
  );
  const angularBridges = readPackageFile(
    "src",
    "styles",
    "surfaces",
    "_angular-bridges.scss",
  );
  const marketingGlobal = readPackageFile(
    "src",
    "styles",
    "surfaces",
    "marketing-global.scss",
  );
  const tokens = JSON.parse(
    readPackageFile("src", "tokens", "viking-tokens.json"),
  );

  assert.match(applicationBundle, /@use "components\/badges" as \*/);
  assert.match(applicationBundle, /@use "components\/icon-inline" as \*/);
  assert.match(applicationBundle, /@use "surfaces\/app-pages" as \*/);
  assert.doesNotMatch(
    applicationBundle,
    /@use ["'][^"']*(?:marketing|docs|backend|swagger)/,
  );
  const applicationClosure = [
    ...collectSassUseClosure(path.join(stylesDir, "viking-app.scss")),
  ].map((filePath) => path.relative(stylesDir, filePath));
  assert.equal(
    applicationClosure.some((filePath) =>
      /(?:^|\/)(?:marketing|docs|backend|swagger)[^/]*\.scss$/.test(filePath),
    ),
    false,
    `Application Sass closure contains a static-only surface: ${applicationClosure.join(", ")}`,
  );
  assert.match(applicationPages, /@use "angular-bridges"/);
  assert.match(angularBridges, /app-root\s*\{/);

  for (const selector of [
    ".main-content",
    ".global-auth-loader",
    ".grecaptcha-badge",
    ".full-width",
    ".api-key-reveal",
    ".danger-zone-card",
    ".loading-state",
    ".filter-group-mobile",
    ".success-container",
    ".not-found-container",
  ]) {
    assert.match(angularBridges, new RegExp(`\\${selector}\\b`));
  }

  assert.doesNotMatch(marketingGlobal, /\.global-auth-loader\b/);
  assert.doesNotMatch(marketingGlobal, /app-root\s*\{/);
  assert.doesNotMatch(marketingGlobal, /\.success-container\b/);
  assert.doesNotMatch(marketingGlobal, /\.not-found-container\b/);
  assert.equal(tokens.zIndex.externalChallenge, 2147483647);
});

test("canonical pill radii do not cycle through legacy aliases", () => {
  const coreStyles = readPackageFile("src", "styles", "viking-ui.scss");
  const variables = readPackageFile("src", "styles", "_variables.scss");
  const legacyAliases = readPackageFile(
    "src",
    "styles",
    "_legacy-aliases.scss",
  );

  assert.match(variables, /--viking-radius-pill:\s*999px/);
  assert.match(
    legacyAliases,
    /--border-radius-pill:\s*var\(--viking-radius-pill\)/,
  );
  assert.doesNotMatch(
    coreStyles,
    /--viking-radius-pill:\s*var\(--border-radius-pill/,
  );
});

test("loading indicators stay circular and the full-page loader uses the branded spinner", () => {
  const spinner = readPackageFile(
    "src",
    "styles",
    "components",
    "spinner.scss",
  );
  const buttons = readPackageFile("src", "styles", "_buttons.scss");
  const staticPrimitives = readPackageFile(
    "src",
    "styles",
    "_static-primitives.scss",
  );
  const appTemplate = readFileSync(
    path.resolve(packageDir, "..", "..", "frontend", "src", "app", "app.html"),
    "utf8",
  );
  const frontendSource = [
    "app.html",
    "pages/dashboard/dashboard.html",
    "pages/vulnerabilities/vulnerabilities.html",
    "pages/success/success.html",
  ]
    .map((file) =>
      readFileSync(
        path.resolve(packageDir, "..", "..", "frontend", "src", "app", file),
        "utf8",
      ),
    )
    .join("\n");

  assert.match(spinner, /viking-spinner\s*\{[\s\S]*aspect-ratio:\s*1;/);
  assert.match(
    spinner,
    /\.viking-spinner-wordmark\s*\{[\s\S]*font-family:\s*var\(--viking-font-family\);/,
  );
  assert.match(buttons, /\.viking-btn-spinner\s*\{[\s\S]*aspect-ratio:\s*1;/);
  assert.match(
    staticPrimitives,
    /\.viking-spinner-static\s*\{[\s\S]*aspect-ratio:\s*1\s*\/\s*1;/,
  );
  assert.match(
    appTemplate,
    /<viking-spinner \[size\]="80" \[branded\]="true" label="Securing your session" \/>/,
  );
  assert.doesNotMatch(frontendSource, /class="(?:spinner|premium-spinner)"/);
});

test("the docs gallery gives every preview the full twelve-column canvas", () => {
  const docsShowcase = readPackageFile(
    "src",
    "styles",
    "surfaces",
    "docs-showcase.scss",
  );

  assert.match(
    docsShowcase,
    /\.showcase-component-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr/,
  );
  assert.doesNotMatch(
    docsShowcase,
    /\.showcase-component-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,/,
  );
});

test("marketing editorial and integration cards keep their shared spacing contracts", () => {
  const bundle = readPackageFile("src", "styles", "viking-ui-bundle.scss");
  const blogIndex = readPackageFile(
    "src",
    "styles",
    "surfaces",
    "marketing-blue-notes-index.scss",
  );
  const blogLedger = readPackageFile(
    "src",
    "styles",
    "surfaces",
    "marketing-blue-notes-ledger.scss",
  );
  const docsBento = readPackageFile(
    "src",
    "styles",
    "surfaces",
    "marketing-docs-bento.scss",
  );

  assert.match(bundle, /@use 'surfaces\/marketing-blue-notes-index' as \*/);
  assert.match(blogIndex, /\.blog-command-hero\s*\{/);
  assert.match(blogLedger, /\.blog-lead-card\s*\{/);
  assert.match(blogLedger, /\.blog-archive-row\s*\{/);
  assert.match(
    docsBento,
    /\.integration-card > \.viking-icon-heading\s*\{[^}]*flex-direction:\s*column;[^}]*gap:\s*var\(--viking-space-3\);/s,
  );
  assert.match(
    docsBento,
    /\.integration-card > \.viking-icon-heading \+ p\s*\{[^}]*padding-left:\s*0;/s,
  );
  assert.match(
    docsBento,
    /\.integration-cards\s*\{\s*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/,
  );
});

test("navigation polish avoids flashy base-state effects", () => {
  const header = readPackageFile("src", "lib", "app-header", "app-header.scss");
  const sidebar = readPackageFile(
    "src",
    "lib",
    "app-sidebar",
    "app-sidebar.scss",
  );

  assert.doesNotMatch(header, /transform:\s*rotate/);
  assert.doesNotMatch(header, /drop-shadow/);
  assert.doesNotMatch(sidebar, /pulse-glow/);
  assert.doesNotMatch(sidebar, /--sidebar-active-bg:\s*linear-gradient/);
});

test("status and active-navigation labels use readable semantic foregrounds", () => {
  const statusBadge = readPackageFile(
    "src",
    "lib",
    "status-badge",
    "status-badge.ts",
  );
  const statusSection = readPackageFile(
    "src",
    "lib",
    "status-section",
    "status-section.ts",
  );
  const announcement = readPackageFile(
    "src",
    "lib",
    "announcement-card",
    "announcement-card.ts",
  );
  const uptimeHistory = readPackageFile(
    "src",
    "lib",
    "uptime-history",
    "uptime-history.ts",
  );
  const sidebar = readPackageFile(
    "src",
    "lib",
    "sidebar-nav",
    "sidebar-nav.scss",
  );
  const pageHeader = readPackageFile(
    "src",
    "styles",
    "surfaces",
    "_page-header-status-cta.scss",
  );

  assert.match(
    statusBadge,
    /\.viking-status-badge-label\s*\{[^}]*color:\s*var\(--viking-text\);/s,
  );
  assert.match(
    statusSection,
    /\.viking-status-section-live\s*\{[^}]*color:\s*var\(--viking-text-link\);/s,
  );
  assert.match(
    announcement,
    /\.viking-announcement-card-tone\s*\{[^}]*color:\s*var\(--viking-text-link\);/s,
  );
  assert.match(
    uptimeHistory,
    /\.uptime-history-legend\s*\{[^}]*color:\s*var\(--viking-text-muted\);/s,
  );
  assert.match(
    sidebar,
    /\.viking-sidebar-nav-link-active\s*\{[^}]*color:\s*var\(--viking-text-link\);[\s\S]*?\.viking-sidebar-nav-label\s*\{[^}]*color:\s*var\(--viking-text-link\);/,
  );
  assert.match(
    sidebar,
    /\.viking-sidebar-nav-tree-item-active\s*\{[^}]*color:\s*var\(--viking-text-link\);[\s\S]*?\.viking-sidebar-nav-tree-label\s*\{[^}]*color:\s*var\(--viking-text-link\);/,
  );
  assert.match(
    pageHeader,
    /\.dashboard-page-container \.section-tag,[\s\S]*?color:\s*var\(--viking-text-link\);/,
  );
});
