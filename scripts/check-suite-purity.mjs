#!/usr/bin/env node
/**
 * Pass 6 — suite purity gate (DEML + optional FORJD sibling).
 *
 * Fails on:
 *  - retired cyan / Google Fonts CDN
 *  - external UI style packages
 *  - suite file drift DEML ↔ FORJD
 *  - leftover one-off theme SCSS on FORJD
 *  - app-level component SCSS (product apps must compose only)
 *  - Pass 1–5 contract scripts
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const forjdRoot = path.resolve(root, "../forjd");
const failures = [];

const RETIRED = [/#00b4ff/i, /fonts\.googleapis\.com/i, /fonts\.gstatic\.com/i];
const STYLE_PKG =
  /@(angular\/material|ng-zorro|primeng)|bootstrap|tailwindcss|font-awesome|lucide-react|@shadcn|@blueprintjs/i;

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
  "out-tsc",
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
    else if (
      /\.(ts|tsx|js|mjs|scss|css|html|astro|json|py|conf)$/i.test(name)
    ) {
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
  if (rel.includes("check-suite-tokens.")) return;
  if (rel.includes("check-suite-components.")) return;
  if (rel.includes("check-suite-landing.")) return;
  if (rel.includes("check-suite-backend.")) return;
  if (rel.includes("check-suite-docs.")) return;
  if (rel.includes("suite-tokens.lock.json")) return;
  if (rel.includes("test_landing_page.py")) return;
  if (rel.includes("SUITE_UI_UNIFICATION")) return; // may document retired hexes
  if (rel.includes("SUITE_PURITY")) return;
  if (rel.includes("SUITE_TOKENS.md") || rel.includes("SUITE_COMPONENTS.md"))
    return;
  if (rel.includes("SUITE_LANDING.md") || rel.includes("SUITE_BACKEND.md"))
    return;
  if (rel.includes("SUITE_DOCS.md")) return;
  // Content / prose may mention brand hexes
  if (rel.includes("/assets/content/")) return;
  if (rel.includes("THEME.md") || rel.includes("BOOK.md")) return;

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

// Pass 1–5 contract scripts
for (const rel of [
  "packages/viking-ui/scripts/check-suite-tokens.mjs",
  "packages/viking-ui/scripts/check-suite-components.mjs",
  "packages/viking-ui/scripts/check-suite-landing.mjs",
  "packages/viking-ui/scripts/check-suite-backend.mjs",
  "packages/viking-ui/scripts/check-suite-docs.mjs",
]) {
  const check = path.join(root, rel);
  if (!existsSync(check)) continue;
  const r = spawnSync(process.execPath, [check], {
    encoding: "utf8",
    cwd: root,
  });
  if (r.status !== 0) {
    failures.push((r.stderr || r.stdout || `${rel} failed`).trim());
  }
}

const suiteFiles = [
  "suite-tokens.css",
  "suite-components.css",
  "suite-landing.css",
  "suite-backend.css",
  "suite-docs.css",
];
const demlTokens = path.join(root, "packages/viking-ui/src/tokens");

// DEML app: no page-level component SCSS under pages/
const demlPages = path.join(root, "frontend/src/app/pages");
if (existsSync(demlPages)) {
  for (const file of walk(demlPages)) {
    if (file.endsWith(".scss") || file.endsWith(".css")) {
      failures.push(
        `DEML page-owned styles: ${path.relative(root, file)} — use suite CSS only`,
      );
    }
  }
}

// viking-ui zero runtime deps
const vikingPkg = path.join(root, "packages/viking-ui/package.json");
if (existsSync(vikingPkg)) {
  const pkg = JSON.parse(readFileSync(vikingPkg, "utf8"));
  if (Object.keys(pkg.dependencies || {}).length > 0) {
    failures.push("viking-ui must have zero runtime dependencies for the look");
  }
}

// FORJD sibling checks
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
      if (name === "tslib") continue;
      if (STYLE_PKG.test(name) || !name.startsWith("@angular")) {
        // only tslib + angular peers allowed in forjd-ui runtime deps
        if (name !== "tslib") {
          // peer angular is fine; runtime style kits not
          if (STYLE_PKG.test(name)) {
            failures.push(`forjd-ui: external style package "${name}"`);
          }
        }
      }
    }
    if (Object.keys(pkg.dependencies || {}).some((n) => n !== "tslib")) {
      const extra = Object.keys(pkg.dependencies || {}).filter(
        (n) => n !== "tslib",
      );
      if (extra.length) {
        failures.push(
          `forjd-ui unexpected runtime deps: ${extra.join(", ")} (look must be suite CSS only)`,
        );
      }
    }
  }

  const bannedForjd = [
    "frontend/libs/forjd-ui/src/lib/styles/_typography.scss",
    "frontend/libs/forjd-ui/src/lib/status-list/status-list.scss",
    "frontend/src/app/landing/landing.scss",
  ];
  for (const rel of bannedForjd) {
    if (existsSync(path.join(forjdRoot, rel))) {
      failures.push(`FORJD leftover theme file: ${rel}`);
    }
  }

  // FORJD app pages must not own scss
  const forjdApp = path.join(forjdRoot, "frontend/src/app");
  if (existsSync(forjdApp)) {
    for (const file of walk(forjdApp)) {
      if (
        (file.endsWith(".scss") || file.endsWith(".css")) &&
        !file.endsWith("app.scss") &&
        !file.endsWith("styles.scss")
      ) {
        failures.push(
          `FORJD app-owned styles: ${path.relative(forjdRoot, file)}`,
        );
      }
    }
  }

  // Landing must load suite CSS, not inline cyan
  const landing = path.join(forjdRoot, "backend/app/core/landing_page.py");
  if (existsSync(landing)) {
    const html = readFileSync(landing, "utf8");
    if (!html.includes("suite-backend.css")) {
      failures.push("FORJD landing_page.py missing suite-backend.css");
    }
    if (!html.includes("suite-fonts.css")) {
      failures.push("FORJD landing_page.py missing suite-fonts.css");
    }
    if (/#00b4ff/i.test(html)) {
      failures.push("FORJD landing_page.py still contains retired cyan");
    }
  }

  for (const file of walk(path.join(forjdRoot, "frontend/src"))) scanFile(file);
  for (const file of walk(path.join(forjdRoot, "frontend/libs/forjd-ui")))
    scanFile(file);
  for (const file of walk(path.join(forjdRoot, "backend/app"))) scanFile(file);
}

// Widget shadow tokens must not use legacy navy surfaces
const widget = path.join(root, "frontend/src/assets/widget.js");
if (existsSync(widget)) {
  const w = readFileSync(widget, "utf8");
  if (/rgb\(16 27 51\)|#101b33/i.test(w)) {
    failures.push(
      "widget.js still embeds legacy navy surfaces — use suite void Role A",
    );
  }
  if (/rgb\(196 160 53\)|#c4a035/i.test(w)) {
    failures.push(
      "widget.js still embeds stale gold #c4a035 — use suite gold #d4af37",
    );
  }
}

if (failures.length) {
  console.error("Suite purity check FAILED:\n");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log(
  "Suite purity check OK — Pass 1–5 contracts, no cyan/Google Fonts, no external UI style packages, suite lockstep.",
);
