#!/usr/bin/env node
/**
 * Pass 2 — assert suite-components.css owns the required primitive set
 * and only references --suite-* (or layout vars) for values.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const cssPath = path.join(packageDir, "src", "tokens", "suite-components.css");
const tokensPath = path.join(packageDir, "src", "tokens", "suite-tokens.css");

const failures = [];

if (!existsSync(cssPath)) {
  console.error("Missing suite-components.css");
  process.exit(1);
}

const css = readFileSync(cssPath, "utf8");

const requiredClasses = [
  "suite-btn",
  "suite-input",
  "suite-textarea",
  "suite-select",
  "suite-checkbox",
  "suite-switch",
  "suite-switch-track",
  "suite-radio",
  "suite-card",
  "suite-badge",
  "suite-dialog",
  "suite-sheet",
  "suite-tabs",
  "suite-tab",
  "suite-table",
  "suite-table-wrap",
  "suite-nav-link",
  "suite-toast",
  "suite-toast-host",
  "suite-skeleton",
  "suite-empty",
  "suite-avatar",
  "suite-separator",
  "suite-callout",
  "suite-progress",
  "suite-spinner",
  "suite-page-shell",
  "suite-stack",
  "suite-link",
];

for (const name of requiredClasses) {
  if (!css.includes(`.${name}`)) {
    failures.push(`Missing required class .${name}`);
  }
}

// Triple-prefix law for core chrome
const triple = ["btn", "input", "card", "badge", "toast", "skeleton", "empty"];
for (const base of triple) {
  for (const prefix of ["suite", "viking", "fj"]) {
    if (!css.includes(`.${prefix}-${base}`)) {
      failures.push(`Missing triple-prefix .${prefix}-${base}`);
    }
  }
}

// No external theme package class leaks
const banned = [
  /mat-mdc-/,
  /\.btn-primary\b/, // bootstrap
  /bp[34]-/,
  /radix-/,
];
for (const pat of banned) {
  if (pat.test(css)) {
    failures.push(`Banned pattern in suite-components: ${pat}`);
  }
}

// Hard-coded product hexes outside of rare gradients should not appear
// (tokens own hexes). Allow only if zero #rrggbb of known brand drift.
if (/#00b4ff/i.test(css)) {
  failures.push("Retired cyan #00b4ff in suite-components.css");
}
if (/#c4a035/i.test(css)) {
  failures.push(
    "Stale gold #c4a035 in suite-components.css — use --suite-gold",
  );
}

// Prefer token vars for colors
const hexCount = (css.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length;
if (hexCount > 0) {
  failures.push(
    `suite-components.css contains ${hexCount} raw hex color(s) — use var(--suite-*)`,
  );
}

// Tokens file must exist for load order
if (!existsSync(tokensPath)) {
  failures.push("suite-tokens.css missing (Pass 1 prerequisite)");
}

// Focus-visible contract
if (!css.includes(":focus-visible")) {
  failures.push("suite-components.css must define :focus-visible styles");
}

// Touch / control
if (!css.includes("--suite-touch") || !css.includes("--suite-control-height")) {
  failures.push("Must use --suite-touch and --suite-control-height");
}

if (failures.length) {
  console.error(
    "suite-components check failed:\n" +
      failures.map((f) => `  - ${f}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  `suite-components OK (${requiredClasses.length} required classes, triple-prefix, token-only colors)`,
);
