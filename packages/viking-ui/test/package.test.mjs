import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const distDir = path.join(packageDir, "dist");
const packageJson = JSON.parse(
  readFileSync(path.join(packageDir, "package.json"), "utf8"),
);

test("package exposes versioned public artifacts", () => {
  assert.match(packageJson.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
  assert.equal(packageJson.private, false);
  assert.equal(packageJson.publishConfig?.access, "public");
  assert.equal(packageJson.exports["./css"], "./dist/viking-ui.css");
  assert.equal(
    packageJson.exports["./elements.js"],
    "./dist/viking-ui-elements.js",
  );
});

test("build writes the framework-neutral distribution files", () => {
  const expectedFiles = [
    "index.js",
    "index.d.ts",
    "viking-ui.css",
    "design-tokens.css",
    "viking-components.css",
    "deml-components.css",
    "viking-ui-elements.js",
    "viking-tokens.json",
  ];

  for (const fileName of expectedFiles) {
    assert.equal(
      existsSync(path.join(distDir, fileName)),
      true,
      `Expected ${fileName} in ${distDir}`,
    );
  }
});
