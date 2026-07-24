import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const readPackageFile = (...segments) =>
  readFileSync(path.join(packageDir, ...segments), "utf8");

const sourceFilesIn = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return sourceFilesIn(entryPath);
    }
    return /\.(?:scss|ts)$/.test(entry.name) ? [entryPath] : [];
  });

const templateFilesIn = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return templateFilesIn(entryPath);
    }
    return entry.name.endsWith(".html") ? [entryPath] : [];
  });

test("spacing tokens preserve compatibility and expose semantic SaaS roles", () => {
  const variables = readPackageFile("src", "styles", "_variables.scss");
  const tokens = JSON.parse(
    readPackageFile("src", "tokens", "viking-tokens.json"),
  );

  assert.match(variables, /--viking-grid-unit:\s*4px;/);
  assert.match(variables, /--viking-space-unit:\s*8px;/);
  assert.match(variables, /--viking-space-0-5:\s*4px;/);
  assert.match(
    variables,
    /--viking-space-content-gap:\s*var\(--viking-space-2\);/,
  );
  assert.match(
    variables,
    /--viking-space-container-gap:\s*var\(--viking-space-3\);/,
  );
  assert.match(variables, /--viking-card-padding:\s*var\(--viking-space-3\);/);
  assert.deepEqual(
    [
      tokens.layout.intrinsicItemCompact,
      tokens.layout.intrinsicItemDefault,
      tokens.layout.intrinsicItemWide,
    ],
    ["256px", "320px", "384px"],
  );

  for (const [name, value] of Object.entries(tokens.spacing)) {
    if (!/^\d+$/.test(name) || name === "0") {
      continue;
    }
    assert.equal(
      Number.parseInt(value, 10) % 8,
      0,
      `Expected spacing.${name} (${value}) to use the 8px primary grid`,
    );
  }
});

test("grid utilities expose an opt-in equal-height row contract", () => {
  const layout = readPackageFile("src", "styles", "_layout-rhythm.scss");
  const angularLayout = readPackageFile("src", "lib", "layout", "layout.ts");

  assert.match(layout, /\.viking-grid\s*\{[^}]*align-items:\s*stretch;/s);
  assert.match(
    layout,
    /\.viking-grid--equal-rows,[^{]*\{\s*grid-auto-rows:\s*1fr;/s,
  );
  assert.match(layout, /\.viking-grid--equal-rows[\s\S]*height:\s*100%;/);
  assert.match(
    layout,
    /\.viking-grid--equal-rows\s*>\s*:where\(viking-grid-item, \.viking-grid-item\)[\s\S]*display:\s*flex;[\s\S]*height:\s*100%;/,
  );
  assert.match(
    layout,
    /:where\(viking-grid-item, \.viking-grid-item\)[\s\S]*> :where\([\s\S]*viking-card[\s\S]*height:\s*100%;/,
  );
  assert.match(
    layout,
    /:where\(viking-grid-item, \.viking-grid-item\)[\s\S]*> :where\([\s\S]*viking-chart-panel[\s\S]*height:\s*100%;/,
  );
  assert.match(
    angularLayout,
    /class VikingPanelGrid[\s\S]*"viking-grid--equal-rows"/,
  );
});

test("form grids own top alignment for fields with uneven helper copy", () => {
  const layout = readPackageFile("src", "styles", "_layout-rhythm.scss");

  assert.match(layout, /\.viking-form-grid\s*\{\s*align-items:\s*start;/);
  assert.match(
    layout,
    /\.viking-form-grid\s*>\s*\*\s*\{[\s\S]*align-self:\s*start;[\s\S]*width:\s*100%;/,
  );
});

test("dashboard performance charts use the equal-height panel recipe", () => {
  const dashboard = readFileSync(
    path.resolve(
      packageDir,
      "..",
      "..",
      "frontend",
      "src",
      "app",
      "pages",
      "dashboard",
      "dashboard.html",
    ),
    "utf8",
  );

  assert.match(
    dashboard,
    /<viking-tab-panel value="performance">[\s\S]*?<viking-panel-grid \[columns\]="2">[\s\S]*?title="Latency Trend \(24h\)"[\s\S]*?title="Threat Severity"[\s\S]*?title="Security Anomalies"/,
  );
});

test("dashboard security panels use the equal-height panel recipe", () => {
  const dashboard = readFileSync(
    path.resolve(
      packageDir,
      "..",
      "..",
      "frontend",
      "src",
      "app",
      "pages",
      "dashboard",
      "dashboard.html",
    ),
    "utf8",
  );

  assert.match(
    dashboard,
    /<viking-tab-panel value="security">[\s\S]*?<viking-panel-grid \[columns\]="2">[\s\S]*?<h2>Threat Queue<\/h2>[\s\S]*?<h2>How threats are detected<\/h2>/,
  );
});

test("vulnerability filters stack and empty detail fills the equal-height row", () => {
  const vulnerabilities = readFileSync(
    path.resolve(
      packageDir,
      "..",
      "..",
      "frontend",
      "src",
      "app",
      "pages",
      "vulnerabilities",
      "vulnerabilities.html",
    ),
    "utf8",
  );
  const triage = readPackageFile(
    "src",
    "styles",
    "surfaces",
    "_vulnerabilities-triage.scss",
  );
  const contentAware = readPackageFile(
    "src",
    "styles",
    "surfaces",
    "_content-aware-layouts.scss",
  );

  assert.match(
    vulnerabilities,
    /<viking-panel-grid class="triage-grid" \[columns\]="12">/,
  );
  assert.match(
    vulnerabilities,
    /layout="fill"[\s\S]*?title="Awaiting Threat Selection"/,
  );
  assert.match(
    triage,
    /\.filter-bar\s*\{[\s\S]*?flex-direction:\s*column;[\s\S]*?align-items:\s*stretch;/,
  );
  assert.match(
    triage,
    /\.filter-group\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?width:\s*100%;[\s\S]*?app-unified-select\s*\{[\s\S]*?width:\s*100%;/,
  );
  assert.doesNotMatch(
    contentAware,
    /@container viking-triage-queue[\s\S]*?\.filter-bar/,
  );
});

test("account API key form uses shared stack rhythm before provisioned credentials", () => {
  const account = readFileSync(
    path.resolve(
      packageDir,
      "..",
      "..",
      "frontend",
      "src",
      "app",
      "pages",
      "account",
      "account.html",
    ),
    "utf8",
  );
  const settings = readPackageFile(
    "src",
    "styles",
    "surfaces",
    "_settings-integrations.scss",
  );

  assert.match(
    account,
    /<viking-card class="status-card-outlined api-keys-card">[\s\S]*?<viking-stack spacing="compact">[\s\S]*?<viking-field label="New Key Name"[\s\S]*?<div class="data-list-outlined">[\s\S]*?<\/viking-stack>/,
  );
  assert.doesNotMatch(
    settings,
    /\.api-keys-card viking-form-section \+ \.data-list-outlined/,
  );
});

test("analytics uses compact three-up gauges, even chart rhythm, and a templated export flow", () => {
  const analytics = readFileSync(
    path.resolve(
      packageDir,
      "..",
      "..",
      "frontend",
      "src",
      "app",
      "pages",
      "analytics",
      "analytics.html",
    ),
    "utf8",
  );
  const analyticsStyles = readPackageFile(
    "src",
    "styles",
    "surfaces",
    "_analytics.scss",
  );

  assert.match(
    analytics,
    /<viking-section-template[\s\S]*?class="analytics-export-card"[\s\S]*?heading="Exports"[\s\S]*?description="Signed downloads · CSV · JSON · Parquet · PDF"[\s\S]*?<viking-form-section heading="Generate"/,
  );
  assert.match(
    analytics,
    /<viking-panel-grid class="analytics-gauge-grid" \[columns\]="3" spacing="tight">[\s\S]*?<h3>System Threat<\/h3>[\s\S]*?<h3>Network Stability<\/h3>/,
  );
  assert.match(
    analytics,
    /<viking-stack class="analytics-traffic-stack" spacing="compact">[\s\S]*?title="Geographic Origins"[\s\S]*?<viking-panel-grid \[columns\]="12">[\s\S]*?title="Request Counts per Endpoint"/,
  );
  assert.match(
    analyticsStyles,
    /\.analytics-gauge-grid\s*\{[\s\S]*?--viking-card-padding:\s*var\(--viking-card-padding-compact\);/,
  );
  assert.match(
    analyticsStyles,
    /\.analytics-gauge-grid \.gauge-wrapper\s*\{\s*max-width:\s*var\(--viking-space-14\);/,
  );
  assert.doesNotMatch(analytics, /Request frequency vs latency/);
  assert.doesNotMatch(
    analyticsStyles,
    /\.analytics-export-card \.metrics-overview-header/,
  );
});

test("settings telemetry ID controls use the top-aligned form recipe", () => {
  const settingsTemplate = readFileSync(
    path.resolve(
      packageDir,
      "..",
      "..",
      "frontend",
      "src",
      "app",
      "pages",
      "settings",
      "settings.html",
    ),
    "utf8",
  );
  const contentAware = readPackageFile(
    "src",
    "styles",
    "surfaces",
    "_content-aware-layouts.scss",
  );

  assert.match(
    settingsTemplate,
    /Telemetry Tracking IDs[\s\S]*?<viking-form-grid \[columns\]="3">\s*<viking-field\s+label="Google Analytics ID"[\s\S]*?label="Microsoft Clarity ID"[\s\S]*?label="Cloudflare Analytics ID"/,
  );
  assert.doesNotMatch(contentAware, /telemetry-id-grid/);
});

test("dashboard overview keeps compact KPI rhythm and balanced status panels", () => {
  const dashboard = readFileSync(
    path.resolve(
      packageDir,
      "..",
      "..",
      "frontend",
      "src",
      "app",
      "pages",
      "dashboard",
      "dashboard.html",
    ),
    "utf8",
  );
  const overview = readPackageFile(
    "src",
    "styles",
    "surfaces",
    "_dashboard-overview.scss",
  );
  const layoutShell = readPackageFile("src", "styles", "layout-shell.scss");

  assert.match(
    layoutShell,
    /\.viking-section\s*\{\s*display:\s*block;/,
    "Custom section elements must be block-level so vertical padding creates row spacing",
  );

  assert.match(
    dashboard,
    /<viking-panel-grid \[columns\]="2" spacing="tight">/,
  );
  assert.match(
    dashboard,
    /<viking-card class="health-card kpi-card" \[compact\]="true">/,
  );
  assert.equal(
    dashboard.match(/<viking-section class="viking-section--compact">/g)
      ?.length,
    2,
  );
  assert.match(
    overview,
    /viking-card\.health-card\.kpi-card\s*\{[\s\S]*flex-direction:\s*row;[\s\S]*align-items:\s*center;[\s\S]*gap:\s*var\(--viking-space-2\);/,
  );
  assert.match(
    overview,
    /\.health-gauge\s*\{[\s\S]*width:\s*var\(--viking-space-16\);/,
  );
  assert.match(
    dashboard,
    /<viking-gauge-arc \[value\]="healthScore\(\) \?\? 0" \[tone\]="healthGaugeTone\(\)" \/>/,
  );
  assert.match(
    overview,
    /viking-card\.kpi-card\s*\{[\s\S]*min-height:\s*var\(--viking-metric-card-min-height\);/,
  );
  assert.match(
    overview,
    /viking-card\.overview-panel\s*\{[\s\S]*min-height:\s*var\(--viking-space-20\);/,
  );
});

test("app layout keeps mobile navigation and uses the real desktop sidebar width", () => {
  const templateStyles = readPackageFile("src", "styles", "_templates.scss");
  const appLayout = readPackageFile(
    "src",
    "lib",
    "app-layout",
    "app-layout.ts",
  );

  assert.match(
    templateStyles,
    /\.viking-app-layout--sidebar-open\s*\{\s*grid-template-columns:\s*auto minmax\(0, 1fr\);/s,
  );
  assert.match(
    templateStyles,
    /\.viking-app-layout--sidebar-open\.viking-app-layout--tools-open\s*\{\s*grid-template-columns:\s*auto minmax\(0, 1fr\) var\(--viking-trailing-width\);/s,
  );
  assert.match(
    templateStyles,
    /\.viking-app-layout--sidebar-toggle-only[\s\S]*> \.viking-app-layout__header\s*\{\s*display:\s*none;/s,
  );
  assert.match(appLayout, /viking-app-layout--sidebar-toggle-only/);
  assert.match(appLayout, /desktopQuery\.addEventListener\("change"/);
  assert.match(appLayout, /desktopQuery\.removeEventListener\("change"/);
});

test("Angular layout primitives compose the canonical layout classes", () => {
  const layout = readPackageFile("src", "lib", "layout", "layout.ts");

  for (const selector of [
    "viking-page-shell",
    "viking-section",
    "viking-stack",
    "viking-grid",
    "viking-panel-grid",
    "viking-grid-item",
    "viking-column-layout",
    "viking-form-grid",
    "viking-cluster",
    "viking-switcher",
  ]) {
    assert.match(layout, new RegExp(`selector: \\\"${selector}\\\"`));
  }
  assert.match(layout, /page-inner-wrapper/);
  assert.match(layout, /viking-grid--equal-rows/);
  assert.match(layout, /class VikingPanelGrid/);
  assert.match(layout, /class VikingFormGrid/);
  assert.match(layout, /viking-cluster--/);
  assert.match(layout, /viking-grid--item-/);
  assert.match(layout, /viking-grid-item--span-md-/);
  assert.match(layout, /viking-grid-item--span-lg-/);
  assert.match(layout, /viking-column-layout--/);
  assert.match(layout, /viking-switcher--/);
});

test("application templates use semantic recipes instead of equal-row flags", () => {
  const frontendPages = path.resolve(
    packageDir,
    "..",
    "..",
    "frontend",
    "src",
    "app",
    "pages",
  );
  const violations = templateFilesIn(frontendPages).flatMap((filePath) => {
    const source = readFileSync(filePath, "utf8");
    return source.includes('[equalRows]="true"')
      ? [path.relative(frontendPages, filePath)]
      : [];
  });

  assert.deepEqual(
    violations,
    [],
    `Use viking-panel-grid instead of equalRows in: ${violations.join(", ")}`,
  );
});

test("grid system exposes 12-track, intrinsic column, and centered container contracts", () => {
  const layoutStyles = readPackageFile("src", "styles", "_layout-rhythm.scss");
  const templateStyles = readPackageFile("src", "styles", "_templates.scss");
  const container = readPackageFile("src", "lib", "container", "container.ts");

  assert.match(layoutStyles, /\.viking-grid\.viking-grid--12/);
  assert.match(layoutStyles, /@for \$span from 1 through 12/);
  assert.match(layoutStyles, /\.viking-column-layout/);
  assert.match(layoutStyles, /repeat\(\s*auto-fit,/s);
  assert.match(container, /VikingContainerWidth/);
  assert.match(container, /viking-container--width-/);
  assert.match(templateStyles, /\.viking-container--centered/);
  assert.match(templateStyles, /--viking-container-max-width-wide/);
});

test("intrinsic layouts adapt to available space without device breakpoints", () => {
  const layout = readPackageFile("src", "styles", "_layout-rhythm.scss");
  const variables = readPackageFile("src", "styles", "_variables.scss");

  assert.match(layout, /\.viking-grid--auto\s*\{/);
  assert.match(layout, /repeat\(\s*auto-fit,/s);
  assert.match(
    layout,
    /minmax\(min\(100%, var\(--viking-grid-item-min\)\), 1fr\)/,
  );
  assert.match(layout, /\.viking-switcher\s*>\s*\*\s*\{/);
  assert.match(layout, /flex-basis:\s*calc\(/);
  assert.match(variables, /--viking-layout-item-compact:\s*16rem;/);
  assert.match(variables, /--viking-layout-item-default:\s*20rem;/);
  assert.match(variables, /--viking-layout-item-wide:\s*24rem;/);
});

test("dense metric components keep the shared 6/12 wide-card contract", () => {
  const metricCard = readPackageFile(
    "src",
    "lib",
    "metric-card",
    "metric-card.ts",
  );
  const exploreCard = readPackageFile(
    "src",
    "lib",
    "explore-card",
    "explore-card.ts",
  );
  const statusSection = readPackageFile(
    "src",
    "lib",
    "status-section",
    "status-section.ts",
  );
  const pageShell = readPackageFile("src", "styles", "page-shell.scss");

  assert.match(metricCard, /"col-span-6"/);
  assert.match(metricCard, /"col-span-md-6"/);
  assert.doesNotMatch(metricCard, /"col-span-4"/);
  assert.doesNotMatch(metricCard, /"col-span-md-4"/);
  assert.match(exploreCard, /grid-auto-rows:\s*1fr;/);
  assert.doesNotMatch(exploreCard, /repeat\(4, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(statusSection, /repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(
    pageShell,
    /\.viking-metric-row,[\s\S]*grid-auto-rows:\s*1fr;[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/,
  );
});

test("component spacing declarations use Viking spacing tokens", () => {
  const componentFiles = [
    ...sourceFilesIn(path.join(packageDir, "src", "lib")),
    ...sourceFilesIn(path.join(packageDir, "src", "web")),
  ];
  const rawPixelSpacing =
    /^\s*(?:gap|row-gap|column-gap|padding(?:-(?:top|right|bottom|left|inline|block))?|margin(?:-(?:top|right|bottom|left|inline|block))?):[^;\n]*\b-?\d+(?:\.\d+)?px\b/gm;

  const violations = componentFiles.flatMap((filePath) => {
    const source = readFileSync(filePath, "utf8");
    return [...source.matchAll(rawPixelSpacing)].map(
      (match) => `${path.relative(packageDir, filePath)}: ${match[0].trim()}`,
    );
  });

  assert.deepEqual(
    violations,
    [],
    `Raw pixel spacing found:\n${violations.join("\n")}`,
  );
});
