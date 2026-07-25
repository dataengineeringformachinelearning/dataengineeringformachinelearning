#!/usr/bin/env node
/**
 * Pass 5 — suite-docs Storybook chrome contracts.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const cssPath = path.join(packageDir, "src", "tokens", "suite-docs.css");
const failures = [];

if (!existsSync(cssPath)) {
  console.error("Missing suite-docs.css");
  process.exit(1);
}

const css = readFileSync(cssPath, "utf8");

const required = [
  "suite-story-shell",
  "suite-story-panel",
  "viking-story-shell",
  "fj-story-shell",
  "viking-story-panel",
  "fj-story-panel",
  "suite-story-grid",
  "suite-story-row",
  "suite-story-stack",
  "suite-story-kicker",
  "suite-story-metric",
  "--suite-bg",
  "--suite-primary",
  "--suite-content-max",
  "data-size",
  "data-bleed",
];

for (const token of required) {
  if (!css.includes(token)) {
    failures.push(`Missing docs contract: ${token}`);
  }
}

if (/#00b4ff/i.test(css) || /#c4a035/i.test(css)) {
  failures.push("Retired/stale brand hex in suite-docs.css");
}

const hexes = css.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
if (hexes.length) {
  failures.push(
    `Raw hex in suite-docs (${hexes.length}) — use var(--suite-*) only`,
  );
}

// Must warn against product load (comment)
if (!css.includes("Do NOT load into product apps")) {
  failures.push("suite-docs.css should document product-app exclusion");
}

if (failures.length) {
  console.error(
    "suite-docs check failed:\n" + failures.map((f) => `  - ${f}`).join("\n"),
  );
  process.exit(1);
}

console.log("suite-docs OK (story shell/panel triple-prefix + token-only)");
