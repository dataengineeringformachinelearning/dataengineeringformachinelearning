#!/usr/bin/env node
/**
 * Pass 4 — suite-backend operational twin contracts.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const cssPath = path.join(packageDir, "src", "tokens", "suite-backend.css");
const failures = [];

if (!existsSync(cssPath)) {
  console.error("Missing suite-backend.css");
  process.exit(1);
}

const css = readFileSync(cssPath, "utf8");

const required = [
  "suite-backend-splash",
  "suite-backend-shell",
  "suite-backend-logo",
  "suite-backend-topbar",
  "suite-backend-brand",
  "backend-splash",
  "backend-splash-shell",
  "backend-splash-logo",
  "backend-docs-topbar",
  "place-items",
  "100dvh",
  "--suite-bg",
  "--suite-primary",
  "--suite-touch",
];

for (const token of required) {
  if (!css.includes(token)) {
    failures.push(`Missing backend contract: ${token}`);
  }
}

if (/#00b4ff/i.test(css) || /#c4a035/i.test(css)) {
  failures.push("Retired/stale brand hex in suite-backend.css");
}

const hexes = css.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
if (hexes.length) {
  failures.push(
    `Raw hex in suite-backend (${hexes.length}) — use var(--suite-*) only`,
  );
}

// Centering law
if (
  !css.includes("justify-content: center") ||
  !css.includes("align-items: center")
) {
  failures.push("Splash shell must center with flex align/justify center");
}

if (failures.length) {
  console.error(
    "suite-backend check failed:\n" +
      failures.map((f) => `  - ${f}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  "suite-backend OK (centered splash + quiet docs topbar + token-only)",
);
