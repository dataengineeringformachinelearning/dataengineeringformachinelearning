import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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
    packageJson.exports["./viking-app.css"],
    "./dist/viking-app.css",
  );
  assert.equal(packageJson.exports["./css/app.css"], "./dist/viking-app.css");
  assert.equal(
    packageJson.exports["./dist/viking-app.css"],
    "./dist/viking-app.css",
  );
  assert.equal(packageJson.sideEffects.includes("./dist/viking-app.css"), true);
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
    "viking-app.css",
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

test("npm pack includes runtime distribution artifacts", () => {
  const packOutput = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: packageDir,
    encoding: "utf8",
  });
  const [packManifest] = JSON.parse(packOutput);
  const packedPaths = new Set(packManifest.files.map((file) => file.path));

  for (const artifact of [
    "dist/fesm2022/dataengineeringformachinelearning-viking-ui.mjs",
    "dist/types/dataengineeringformachinelearning-viking-ui.d.ts",
    "dist/viking-app.css",
    "dist/viking-ui.css",
    "dist/web-components.js",
    "dist/viking-ui-elements.js",
    "dist/widget.js",
  ]) {
    assert.equal(
      packedPaths.has(artifact),
      true,
      `Expected ${artifact} in npm tarball`,
    );
  }
});
