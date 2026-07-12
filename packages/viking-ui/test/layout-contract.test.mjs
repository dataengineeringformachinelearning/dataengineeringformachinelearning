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

test("spacing tokens preserve the 4px micro and 8px primary grids", () => {
  const variables = readPackageFile("src", "styles", "_variables.scss");
  const tokens = JSON.parse(
    readPackageFile("src", "tokens", "viking-tokens.json"),
  );

  assert.match(variables, /--viking-grid-unit:\s*4px;/);
  assert.match(variables, /--viking-space-unit:\s*8px;/);
  assert.match(variables, /--viking-space-0-5:\s*4px;/);
  assert.match(variables, /--viking-card-padding:\s*var\(--viking-space-5\);/);
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

  assert.match(layout, /\.viking-grid\s*\{[^}]*align-items:\s*stretch;/s);
  assert.match(
    layout,
    /\.viking-grid--equal-rows,[^{]*\{\s*grid-auto-rows:\s*1fr;/s,
  );
  assert.match(layout, /\.viking-grid--equal-rows[\s\S]*height:\s*100%;/);
});

test("Angular layout primitives compose the canonical layout classes", () => {
  const layout = readPackageFile("src", "lib", "layout", "layout.ts");

  for (const selector of [
    "viking-page-shell",
    "viking-section",
    "viking-stack",
    "viking-grid",
    "viking-cluster",
    "viking-switcher",
  ]) {
    assert.match(layout, new RegExp(`selector: \\\"${selector}\\\"`));
  }
  assert.match(layout, /page-inner-wrapper/);
  assert.match(layout, /viking-grid--equal-rows/);
  assert.match(layout, /viking-cluster--/);
  assert.match(layout, /viking-grid--item-/);
  assert.match(layout, /viking-switcher--/);
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

  assert.match(metricCard, /col-span-6 col-span-md-6/);
  assert.doesNotMatch(metricCard, /col-span-4 col-span-md-4/);
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
