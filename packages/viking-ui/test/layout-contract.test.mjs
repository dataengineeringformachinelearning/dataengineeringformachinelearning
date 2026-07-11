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
  ]) {
    assert.match(layout, new RegExp(`selector: \\\"${selector}\\\"`));
  }
  assert.match(layout, /page-inner-wrapper/);
  assert.match(layout, /viking-grid--equal-rows/);
  assert.match(layout, /viking-cluster--/);
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
