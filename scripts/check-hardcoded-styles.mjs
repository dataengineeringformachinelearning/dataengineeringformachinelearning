#!/usr/bin/env node
/**
 * Fail on bare padding/margin/gap px and font-size literals in Viking-UI
 * product styles. Token definitions (_variables, suite-tokens, series) are
 * exempt. Brand icon hex files are exempt.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scanRoots = [
  path.join(root, "packages/viking-ui/src/styles"),
  path.join(root, "packages/viking-ui/src/lib"),
  path.join(root, "packages/viking-ui/src/web"),
  path.join(root, "packages/viking-ui/src/tokens/suite-components.css"),
  path.join(root, "packages/viking-ui/src/tokens/suite-landing.css"),
  path.join(root, "packages/viking-ui/src/tokens/suite-backend.css"),
  path.join(root, "packages/viking-ui/src/tokens/suite-docs.css"),
];

const SKIP_NAMES = new Set([
  "_variables.scss",
  "_series-colors.scss",
  "suite-tokens.css",
  "integration-brand-icons.ts",
  "icon.ts",
]);

const failures = [];

/** @param {string} dir @param {string[]} out */
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  const st = statSync(dir);
  if (st.isFile()) {
    out.push(dir);
    return out;
  }
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist") continue;
    walk(path.join(dir, name), out);
  }
  return out;
}

const SPACE_PROP =
  /(?:padding|margin|gap|row-gap|column-gap)(?:-(?:top|right|bottom|left|block|inline))?\s*:\s*([^;]+);/gi;
const FONT_PROP = /font-size\s*:\s*([^;]+);/gi;

for (const entry of scanRoots) {
  for (const file of walk(entry)) {
    if (!/\.(scss|css|ts)$/.test(file)) continue;
    if (SKIP_NAMES.has(path.basename(file))) continue;
    const text = readFileSync(file, "utf8");
    const rel = path.relative(root, file);

    for (const m of text.matchAll(SPACE_PROP)) {
      const stripped = m[1].replace(/var\([^)]*\)/g, "");
      if (/\d+px/.test(stripped)) {
        failures.push(`${rel}: bare px in ${m[0].trim().slice(0, 80)}`);
      }
    }
    for (const m of text.matchAll(FONT_PROP)) {
      const v = m[1].trim();
      if (
        v.startsWith("var(") ||
        v.startsWith("clamp(") ||
        v.startsWith("calc(") ||
        v.startsWith("max(") ||
        v.startsWith("min(") ||
        v === "inherit" ||
        v === "larger" ||
        v === "smaller" ||
        v.endsWith("%")
      ) {
        // Still flag literal px floors inside max()/min()/calc()
        const stripped = v.replace(/var\([^)]*\)/g, "");
        if (/\d+(?:\.\d+)?(?:px|rem|em)\b/.test(stripped)) {
          failures.push(`${rel}: bare length in font-size ${v.slice(0, 60)}`);
        }
        continue;
      }
      failures.push(`${rel}: bare font-size ${v}`);
    }
  }
}

if (failures.length) {
  console.error("Hardcoded style check FAILED:\n");
  for (const f of failures.slice(0, 80)) console.error(" -", f);
  if (failures.length > 80) {
    console.error(` … and ${failures.length - 80} more`);
  }
  process.exit(1);
}

console.log(
  "Hardcoded style check OK — padding/margin/gap and font-size use design tokens.",
);
