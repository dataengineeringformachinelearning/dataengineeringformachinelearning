#!/usr/bin/env node
/**
 * Pass 1 — assert Role A chrome hexes in suite-tokens.css match suite-tokens.lock.json.
 * Also rejects retired product cyan in the canonical token file.
 *
 * Uses string includes (not dynamic RegExp) so pre-commit Semgrep stays quiet;
 * lock values are developer-controlled fixtures, not user input.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const tokensDir = path.join(packageDir, "src", "tokens");
const cssPath = path.join(tokensDir, "suite-tokens.css");
const lockPath = path.join(tokensDir, "suite-tokens.lock.json");

const failures = [];

if (!existsSync(cssPath) || !existsSync(lockPath)) {
  console.error("Missing suite-tokens.css or suite-tokens.lock.json");
  process.exit(1);
}

const css = readFileSync(cssPath, "utf8");
const lock = JSON.parse(readFileSync(lockPath, "utf8"));

/** Normalize CSS for simple token:value matching (collapse whitespace). */
const compact = css.replace(/\s+/g, " ");

/**
 * @param {string} name
 * @param {string} value
 */
function mustDeclare(name, value) {
  const needle = `--suite-${name}: ${value}`;
  if (
    !compact.includes(needle) &&
    !compact.toLowerCase().includes(needle.toLowerCase())
  ) {
    // allow optional semicolon adjacency after prettier variance
    const alt = `--suite-${name}:${value}`;
    if (!compact.replace(/:\s+/g, ":").includes(alt.replace(/:\s+/g, ":"))) {
      failures.push(`Expected --suite-${name}: ${value} in suite-tokens.css`);
    }
  }
}

const d = lock.dark;
mustDeclare("brand-navy", d.brand.navy);
mustDeclare("brand-blue", d.brand.blue);
mustDeclare("bg", d.surface.bg);
mustDeclare("bg-subtle", d.surface.bgSubtle);
mustDeclare("surface", d.surface.surface);
mustDeclare("surface-2", d.surface.surface2);
mustDeclare("surface-elevated", d.surface.elevated);
mustDeclare("ink", d.ink.default);
mustDeclare("ink-muted", d.ink.muted);
mustDeclare("ink-subtle", d.ink.subtle);
mustDeclare("ink-disabled", d.ink.disabled);
mustDeclare("border", d.border.default);
mustDeclare("border-strong", d.border.strong);
mustDeclare("primary", d.primary.default);
mustDeclare("primary-hover", d.primary.hover);
mustDeclare("primary-active", d.primary.active);
mustDeclare("primary-strong", d.primary.strong);
mustDeclare("ring", d.primary.ring);
mustDeclare("gold", d.gold);
mustDeclare("gold-text", d.goldText);
mustDeclare("success", d.status.success);
mustDeclare("success-text", d.status.successText);
mustDeclare("warning", d.status.warning);
mustDeclare("warning-text", d.status.warningText);
mustDeclare("danger", d.status.danger);
mustDeclare("danger-text", d.status.dangerText);

// Layout contracts (values as declared)
const layoutChecks = [
  ["space-unit", lock.layout.spaceUnit],
  ["space-0-5", lock.layout.spaceTight],
  ["content-max", lock.layout.contentMax],
  ["touch", lock.layout.touch],
  ["control-height", lock.layout.controlHeight],
];
for (const [name, value] of layoutChecks) {
  mustDeclare(name, value);
}

// Light theme primary (appears as a later --suite-primary assignment)
const lightPrimary = lock.light.primary.default;
if (
  !compact
    .toLowerCase()
    .includes(`--suite-primary: ${lightPrimary}`.toLowerCase())
) {
  failures.push(`Expected light --suite-primary: ${lightPrimary}`);
}

// Retired cyan must not appear as a suite CSS assignment
if (compact.toLowerCase().includes("#00b4ff")) {
  // allow only if not assigned to suite vars — still fail hard for purity
  failures.push("Retired cyan #00b4ff must not appear in suite-tokens.css");
}

// Prefix law
if (
  !css.includes("--suite-") ||
  !css.includes("--viking-") ||
  !css.includes("--fj-")
) {
  failures.push(
    "suite-tokens.css must define --suite-*, --viking-*, and --fj-*",
  );
}

// Theme strategy markers
if (
  !css.includes('html[data-theme="dark"]') ||
  !css.includes('html[data-theme="light"]')
) {
  failures.push(
    "suite-tokens.css must define dark default + light opt-in blocks",
  );
}

if (failures.length) {
  console.error(
    "suite-tokens lock check failed:\n" +
      failures.map((f) => `  - ${f}`).join("\n"),
  );
  process.exit(1);
}

console.log(
  "suite-tokens lock OK (Role A chrome matches suite-tokens.lock.json)",
);
