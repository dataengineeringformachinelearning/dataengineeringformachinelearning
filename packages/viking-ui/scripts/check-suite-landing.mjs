#!/usr/bin/env node
/**
 * Pass 3 — suite-landing stage contracts + no raw product hex drift.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const cssPath = path.join(packageDir, "src", "tokens", "suite-landing.css");
const failures = [];

if (!existsSync(cssPath)) {
  console.error("Missing suite-landing.css");
  process.exit(1);
}

const css = readFileSync(cssPath, "utf8");

const required = [
  "suite-landing",
  "suite-landing-hero",
  "suite-landing-badge",
  "suite-landing-brand",
  "suite-landing-headline",
  "suite-landing-lede",
  "suite-landing-actions",
  "suite-landing-actions-primary",
  "suite-landing-actions-secondary",
  "suite-landing-section-header",
  "suite-landing-tag",
  "suite-landing-steps",
  "suite-landing-grid",
  "suite-landing-band",
  "suite-landing-metric-list",
  "suite-landing-meta",
  "suite-hero-in",
  "suite-pulse",
];

for (const name of required) {
  if (!css.includes(name)) {
    failures.push(`Missing suite landing contract: ${name}`);
  }
}

// Aliases for deml / marketing lockstep
for (const alias of [
  "viking-unified-hero",
  "landing-container",
  "community-home",
  "hero-badge",
  "showcase-band",
  "quick-start-steps",
]) {
  if (!css.includes(alias)) {
    failures.push(`Missing lockstep alias for ${alias}`);
  }
}

if (/#00b4ff/i.test(css) || /#c4a035/i.test(css)) {
  failures.push("Retired/stale brand hex in suite-landing.css");
}

const hexes = css.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
if (hexes.length) {
  failures.push(
    `Raw hex colors in suite-landing (${hexes.length}) — use var(--suite-*)`,
  );
}

if (!css.includes("--suite-primary") || !css.includes("--suite-bg")) {
  failures.push("suite-landing must reference Pass 1 tokens");
}

if (failures.length) {
  console.error(
    "suite-landing check failed:\n" +
      failures.map((f) => `  - ${f}`).join("\n"),
  );
  process.exit(1);
}

console.log("suite-landing OK (stage contracts + aliases + token-only)");
