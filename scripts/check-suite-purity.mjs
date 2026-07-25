#!/usr/bin/env node
/**
 * Pass 6 — suite purity gate (DEML + optional FORJD sibling).
 * Fails on retired cyan, external style theme packages, and suite file drift.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const forjdRoot = path.resolve(root, "../forjd");
const failures = [];

const RETIRED = [/#00b4ff/i, /fonts\.googleapis\.com/i];
const STYLE_PKG =
  /@(angular\/material|ng-zorro|primeng)|bootstrap|tailwindcss|font-awesome|lucide-react|@shadcn/i;

const SKIP_DIR = new Set([
  "node_modules",
  "dist",
  ".git",
  "coverage",
  "storybook-static",
  ".angular",
  "public",
  "venv",
  ".venv",
]);

/** @param {string} dir */
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue;
    const full = path.join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|mjs|scss|css|html|astro|json|py)$/i.test(name)) {
      out.push(full);
    }
  }
  return out;
}

/** @param {string} file */
function scanFile(file) {
  const rel = path.relative(root, file);
  if (rel.includes("package-lock.json")) return;
  if (rel.includes("check-suite-purity.")) return;
  if (rel.includes("test_landing_page.py")) return; // asserts absence
  const text = readFileSync(file, "utf8");
  for (const pat of RETIRED) {
    if (pat.test(text)) {
      failures.push(`${rel}: matches ${pat}`);
    }
  }
  if (/package\.json$/i.test(file)) {
    try {
      const pkg = JSON.parse(text);
      const deps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
        ...pkg.peerDependencies,
      };
      for (const name of Object.keys(deps || {})) {
        if (STYLE_PKG.test(name)) {
          failures.push(`${rel}: external style package "${name}"`);
        }
      }
    } catch {
      /* ignore */
    }
  }
}

for (const file of walk(root)) scanFile(file);

const suiteFiles = [
  "suite-tokens.css",
  "suite-components.css",
  "suite-landing.css",
  "suite-backend.css",
  "suite-docs.css",
];
const demlTokens = path.join(root, "packages/viking-ui/src/tokens");

if (existsSync(forjdRoot)) {
  const forjdUi = path.join(forjdRoot, "frontend/libs/forjd-ui/src/lib/styles");
  for (const name of suiteFiles) {
    const a = path.join(demlTokens, name);
    const b = path.join(forjdUi, name);
    if (!existsSync(b)) {
      failures.push(`FORJD missing vendored ${name} — run npm run sync:suite`);
      continue;
    }
    const ha = createHash("sha256").update(readFileSync(a)).digest("hex");
    const hb = createHash("sha256").update(readFileSync(b)).digest("hex");
    if (ha !== hb) {
      failures.push(
        `Suite drift: ${name} DEML ≠ FORJD — run npm run sync:suite`,
      );
    }
  }

  const forjdPkg = path.join(forjdRoot, "frontend/libs/forjd-ui/package.json");
  if (existsSync(forjdPkg)) {
    const pkg = JSON.parse(readFileSync(forjdPkg, "utf8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const name of Object.keys(deps || {})) {
      if (STYLE_PKG.test(name)) {
        failures.push(`forjd-ui: external style package "${name}"`);
      }
    }
  }

  const typography = path.join(
    forjdRoot,
    "frontend/libs/forjd-ui/src/lib/styles/_typography.scss",
  );
  if (existsSync(typography)) {
    failures.push(
      "FORJD leftover _typography.scss — use suite-landing type roles",
    );
  }
  const statusScss = path.join(
    forjdRoot,
    "frontend/libs/forjd-ui/src/lib/status-list/status-list.scss",
  );
  if (existsSync(statusScss)) {
    failures.push("FORJD leftover status-list.scss — use suite-components");
  }

  for (const file of walk(path.join(forjdRoot, "frontend/src"))) scanFile(file);
  for (const file of walk(path.join(forjdRoot, "frontend/libs/forjd-ui")))
    scanFile(file);
  for (const file of walk(path.join(forjdRoot, "backend/app"))) scanFile(file);
}

const vikingPkg = path.join(root, "packages/viking-ui/package.json");
if (existsSync(vikingPkg)) {
  const pkg = JSON.parse(readFileSync(vikingPkg, "utf8"));
  if (Object.keys(pkg.dependencies || {}).length > 0) {
    failures.push("viking-ui must have zero runtime dependencies for the look");
  }
}

if (failures.length) {
  console.error("Suite purity check FAILED:\n");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log(
  "Suite purity check OK — no cyan, no external style themes, suite files in lockstep.",
);
