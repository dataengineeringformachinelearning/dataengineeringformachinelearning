/**
 * Mirrors the canonical Viking-UI package artifacts into the docs site.
 * Source of truth: packages/viking-ui.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(dirname, "..");
const rootDir = path.join(docsDir, "..");
const packageDir = path.join(rootDir, "packages", "viking-ui");
const packageDistDir = path.join(packageDir, "dist");
const outDir = path.join(docsDir, "dist", "static-css");
const publicAssetsDir = path.join(docsDir, "public", "assets");

const artifacts = [
  "design-tokens.css",
  "viking-components.css",
  "deml-components.css",
  "viking-ui.css",
  "viking-ui-elements.js",
  "viking-tokens.json",
];

execFileSync("npm", ["run", "build"], {
  cwd: packageDir,
  stdio: "inherit",
});

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(publicAssetsDir, { recursive: true });

for (const name of artifacts) {
  const source = path.join(packageDistDir, name);
  if (!fs.existsSync(source)) {
    throw new Error(`Expected Viking-UI package artifact missing: ${source}`);
  }

  fs.copyFileSync(source, path.join(outDir, name));
  fs.copyFileSync(source, path.join(publicAssetsDir, name));
  console.log(`Mirrored ${name}`);
}
