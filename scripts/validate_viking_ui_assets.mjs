#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const packageDistDir = path.join(rootDir, "packages", "viking-ui", "dist");

const hashFile = (filePath) =>
  createHash("sha256").update(readFileSync(filePath)).digest("hex");

const readText = (relativePath) =>
  readFileSync(path.join(rootDir, relativePath), "utf8");

const failures = [];

const requireFile = (relativePath) => {
  const filePath = path.join(rootDir, relativePath);
  if (!existsSync(filePath)) {
    failures.push(`Missing expected file: ${relativePath}`);
  }
  return filePath;
};

const requireSameFile = (sourceRelativePath, targetRelativePath) => {
  const sourcePath = requireFile(sourceRelativePath);
  const targetPath = requireFile(targetRelativePath);
  if (!existsSync(sourcePath) || !existsSync(targetPath)) {
    return;
  }
  if (hashFile(sourcePath) !== hashFile(targetPath)) {
    failures.push(
      `${targetRelativePath} is stale; sync it from ${sourceRelativePath}`,
    );
  }
};

const packageArtifacts = [
  "design-tokens.css",
  "viking-components.css",
  "deml-components.css",
  "viking-ui.css",
  "viking-ui-elements.js",
  "viking-tokens.json",
  "fonts/inter/InterVariable.woff2",
  "fonts/inter/InterVariable-Italic.woff2",
  "index.js",
  "index.d.ts",
];

for (const artifact of packageArtifacts) {
  requireFile(path.join("packages", "viking-ui", "dist", artifact));
}

const staticMirrors = [
  ["viking-ui.css", "backend/static/viking-ui.css"],
  ["viking-ui.css", "marketing/public/assets/viking-ui.css"],
  ["viking-ui.css", "viking-ui-docs/public/assets/viking-ui.css"],
  ["viking-ui-elements.js", "backend/static/viking-ui-elements.js"],
  ["viking-ui-elements.js", "marketing/public/assets/viking-ui-elements.js"],
  [
    "viking-ui-elements.js",
    "viking-ui-docs/public/assets/viking-ui-elements.js",
  ],
  ["viking-tokens.json", "viking-ui-docs/public/assets/viking-tokens.json"],
];

for (const [artifact, mirror] of staticMirrors) {
  requireSameFile(path.join("packages", "viking-ui", "dist", artifact), mirror);
}

const optionalDocsMirrors = [
  ["viking-ui.css", "viking-ui-docs/dist/static-css/viking-ui.css"],
  [
    "viking-ui-elements.js",
    "viking-ui-docs/dist/static-css/viking-ui-elements.js",
  ],
  ["viking-tokens.json", "viking-ui-docs/dist/static-css/viking-tokens.json"],
];

for (const [artifact, mirror] of optionalDocsMirrors) {
  if (existsSync(path.join(rootDir, mirror))) {
    requireSameFile(
      path.join("packages", "viking-ui", "dist", artifact),
      mirror,
    );
  }
}

const frontendAngularJson = readText("frontend/angular.json");
if (!frontendAngularJson.includes("../packages/viking-ui/dist/viking-ui.css")) {
  failures.push(
    "frontend/angular.json must load ../packages/viking-ui/dist/viking-ui.css globally.",
  );
}

const sourceImportChecks = [
  "frontend/src/styles.scss",
  "frontend/src/theme.scss",
];

const removedFrontendMirrors = [
  "frontend/src/assets/design-tokens.css",
  "frontend/src/assets/viking-components.css",
  "frontend/src/assets/deml-components.css",
  "frontend/src/assets/viking-ui.css",
  "frontend/src/assets/viking-ui-elements.js",
  "frontend/public/assets/design-tokens.css",
  "frontend/public/assets/viking-components.css",
  "frontend/public/assets/deml-components.css",
  "frontend/public/assets/viking-ui.css",
  "frontend/public/assets/viking-ui-elements.js",
  "backend/static/design-tokens.css",
  "backend/static/viking-components.css",
  "backend/static/deml-components.css",
  "marketing/public/assets/design-tokens.css",
  "marketing/public/assets/viking-components.css",
  "marketing/public/assets/deml-components.css",
  "viking-ui-docs/public/assets/design-tokens.css",
  "viking-ui-docs/public/assets/viking-components.css",
  "viking-ui-docs/public/assets/deml-components.css",
];

for (const relativePath of removedFrontendMirrors) {
  if (existsSync(path.join(rootDir, relativePath))) {
    failures.push(
      `${relativePath} should not exist; Angular consumes packages/viking-ui/dist via angular.json.`,
    );
  }
}

for (const relativePath of sourceImportChecks) {
  const content = readText(relativePath);
  if (content.includes("projects/viking-ui/src/styles")) {
    failures.push(
      `${relativePath} must consume package CSS instead of Viking-UI source SCSS.`,
    );
  }
}

const singleBundleLayouts = [
  "marketing/src/layouts/Layout.astro",
  "viking-ui-docs/src/layouts/BaseLayout.astro",
  "backend/templates/base.html",
];

for (const relativePath of singleBundleLayouts) {
  const content = readText(relativePath);
  const cssLinks = content.match(/<link[^>]+viking-ui\.css[^>]*>/g) ?? [];
  if (cssLinks.length !== 1) {
    failures.push(`${relativePath} should load viking-ui.css exactly once.`);
  }
  for (const splitBundle of [
    "design-tokens.css",
    "viking-components.css",
    "deml-components.css",
  ]) {
    if (content.includes(splitBundle)) {
      failures.push(
        `${relativePath} should not load ${splitBundle}; viking-ui.css is the full bundle.`,
      );
    }
  }
}

const marketingLayout = readText("marketing/src/layouts/Layout.astro");
const marketingElementsScripts =
  marketingLayout.match(/<script[^>]+viking-ui-elements\.js[^>]*>/g) ?? [];
if (marketingElementsScripts.length !== 1) {
  failures.push(
    "marketing/src/layouts/Layout.astro should load viking-ui-elements.js exactly once.",
  );
}

const packageJson = JSON.parse(readText("packages/viking-ui/package.json"));
const requiredExports = [
  "./viking-ui.css",
  "./design-tokens.css",
  "./components.css",
  "./deml-components.css",
  "./elements.js",
  "./viking-ui-elements.js",
  "./tokens.json",
];

for (const exportPath of requiredExports) {
  if (!packageJson.exports?.[exportPath]) {
    failures.push(
      `packages/viking-ui/package.json is missing export ${exportPath}`,
    );
  }
}

if (!existsSync(packageDistDir)) {
  failures.push(
    "packages/viking-ui/dist does not exist; run npm run build:viking-ui:package.",
  );
}

if (failures.length > 0) {
  console.error("Viking-UI asset validation failed:");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("Viking-UI package artifacts and static consumers are in sync.");
