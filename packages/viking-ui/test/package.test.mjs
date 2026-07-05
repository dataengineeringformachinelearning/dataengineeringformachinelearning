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
  assert.equal(
    packageJson.exports["./web-components.js"],
    "./dist/web-components.js",
  );
  assert.equal(packageJson.exports["./widget"], "./dist/widget.js");
  assert.equal(packageJson.exports["./icons"].import, "./dist/icons.js");
  assert.equal(
    packageJson.exports["./site-drakkar"].import,
    "./dist/site-drakkar.js",
  );
  assert.equal(
    packageJson.exports["./tokens/tailwind.preset"],
    "./dist/src/tokens/tailwind.preset.js",
  );
  assert.equal(
    packageJson.exports["./manifest"],
    "./dist/viking.manifest.json",
  );
  assert.deepEqual(packageJson.files, ["dist", "README.md", "LICENSE"]);
});

test("build writes the framework-neutral distribution files", () => {
  const expectedFiles = [
    "index.js",
    "index.d.ts",
    "viking-ui.css",
    "design-tokens.css",
    "viking-components.css",
    "deml-components.css",
    "icons.js",
    "site-drakkar.js",
    "viking-ui-elements.js",
    "web-components.js",
    "widget.js",
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
