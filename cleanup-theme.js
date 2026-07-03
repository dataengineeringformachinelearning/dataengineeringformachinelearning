#!/usr/bin/env node
/**
 * DEML Viking-UI theme cleanup — enforces THEME.md consistency across all properties.
 *
 * Usage:
 *   node cleanup-theme.js --dry-run   Report violations (default)
 *   node cleanup-theme.js --apply     Apply safe automatic fixes
 */
const fs = require("fs");
const path = require("path");

const WORKSPACE_ROOT = path.resolve(__dirname);

/** @param {string} targetPath */
const isWithinWorkspace = (targetPath) => {
  const normalized = path.normalize(targetPath);
  return (
    normalized === WORKSPACE_ROOT ||
    normalized.startsWith(`${WORKSPACE_ROOT}${path.sep}`)
  );
};

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const verbose = args.includes("--verbose") || args.includes("-v");

/** @type {Set<string>} */
const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "dist",
  ".angular",
  "coverage",
  "htmlcov",
  "__pycache__",
  ".vite",
  ".sanity",
]);

/** @type {readonly string[]} */
const SCAN_ROOTS = [
  "frontend/src",
  "frontend/projects/viking-ui/src",
  "frontend/projects/viking-ui-showcase/src",
  "marketing/src",
  "marketing/public/assets/widgets",
  "backend/templates",
  "backend/static",
  "packages/deml-design-system/src",
];

/** @type {readonly string[]} */
const RESOLVED_SCAN_ROOTS = SCAN_ROOTS.map((root) => {
  // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
  const resolved = path.join(WORKSPACE_ROOT, root);
  if (!isWithinWorkspace(resolved)) {
    throw new Error(`Invalid scan root: ${root}`);
  }
  return resolved;
});

/** @type {RegExp[]} */
const SKIP_FILE_PATTERNS = [
  /[/\\]viking-ui\.css$/,
  /[/\\]design-tokens\.css$/,
  /[/\\]deml-components\.css$/,
  /[/\\]openapi\.json$/,
  /[/\\]package-lock\.json$/,
  /[/\\]THEME\.md$/,
  /[/\\]page\.md$/,
  /[/\\]BOOK\.md$/,
];

/** @type {RegExp} */
const SCANNABLE_EXTENSIONS = /\.(html|htm|astro|scss|css|ts|tsx|js|jsx|svg)$/i;

/** @type {RegExp} */
const TOKEN_DEFINITION_FILE =
  /[/\\](_variables\.scss|tokens\.scss|viking-ui-bundle\.scss)$/;

/** Canonical series palette from THEME.md §8.4 */
const SERIES_PRESETS = [
  "#0d7377",
  "#922b3e",
  "#2a9d8f",
  "#c4a035",
  "#a83344",
  "#3d8bfd",
  "#2a2a2a",
  "#666666",
];

/** Hex literals allowed outside token definition files when on canonical palette. */
const PALETTE_HEX = new Set([
  "#0a0a0a",
  "#111111",
  "#1a1a1a",
  "#2a2a2a",
  "#333333",
  "#444444",
  "#555555",
  "#666666",
  "#777777",
  "#999999",
  "#aaaaaa",
  "#bbbbbb",
  "#0a5c5f",
  "#0d7377",
  "#109094",
  "#14a3a8",
  "#2db8bd",
  "#7a2231",
  "#922b3e",
  "#a83344",
  "#c44355",
  "#2a9d8f",
  "#c4a035",
  "#3d8bfd",
  "#f5f5f5",
  "#ffffff",
  "#000000",
  "#ff0000",
  "#0000ff",
  "#f7f7f7",
  "#efefef",
]);

/** Retired Lab Coat / legacy hex → Viking CSS variable replacements. */
const LEGACY_HEX_TO_VAR = new Map([
  ["#2176ff", "var(--viking-teal-600)"],
  ["#2176FF", "var(--viking-teal-600)"],
  ["#31393c", "var(--viking-charcoal-900)"],
  ["#31393C", "var(--viking-charcoal-900)"],
  ["#33a1fd", "var(--viking-teal-400)"],
  ["#33A1FD", "var(--viking-teal-400)"],
  ["#fdca40", "var(--viking-gold-500)"],
  ["#FDCA40", "var(--viking-gold-500)"],
  ["#f79824", "var(--viking-crimson-500)"],
  ["#F79824", "var(--viking-crimson-500)"],
  ["#121212", "var(--viking-charcoal-900)"],
  ["#ffffff", "var(--viking-white-pure)"],
  ["#fff", "var(--viking-white-pure)"],
  ["#FFFFFF", "var(--viking-white-pure)"],
  ["#FFF", "var(--viking-white-pure)"],
  ["#000000", "var(--viking-black)"],
  ["#000", "var(--viking-black)"],
  ["#f5f5f5", "var(--viking-white)"],
  ["#F5F5F5", "var(--viking-white)"],
  ["#0d7377", "var(--viking-teal-600)"],
  ["#0D7377", "var(--viking-teal-600)"],
  ["#922b3e", "var(--viking-crimson-600)"],
  ["#922B3E", "var(--viking-crimson-600)"],
  ["#2a9d8f", "var(--viking-green-500)"],
  ["#2A9D8F", "var(--viking-green-500)"],
  ["#c4a035", "var(--viking-gold-500)"],
  ["#C4A035", "var(--viking-gold-500)"],
  ["#a83344", "var(--viking-crimson-500)"],
  ["#A83344", "var(--viking-crimson-500)"],
  ["#3d8bfd", "var(--viking-blue-500)"],
  ["#3D8BFD", "var(--viking-blue-500)"],
  ["#2a2a2a", "var(--viking-charcoal-700)"],
  ["#2A2A2A", "var(--viking-charcoal-700)"],
  ["#666666", "var(--viking-metallic-500)"],
]);

/** Legacy CSS custom properties → Viking tokens. */
const LEGACY_VAR_REPLACEMENTS = [
  [/var\(\s*--jet-black\s*(?:,\s*[^)]+)?\)/g, "var(--viking-charcoal-900)"],
  [/var\(\s*--crayola-blue\s*\)/g, "var(--viking-teal-600)"],
  [/var\(\s*--blue-bell\s*\)/g, "var(--viking-teal-400)"],
  [/var\(\s*--golden-pollen\s*\)/g, "var(--viking-gold-500)"],
  [/var\(\s*--carrot-orange\s*\)/g, "var(--viking-crimson-500)"],
  [
    /--jet-black:\s*#[0-9a-fA-F]{3,8}/g,
    "--viking-charcoal-900: var(--viking-charcoal-900)",
  ],
  [
    /--crayola-blue:\s*#[0-9a-fA-F]{3,8}/g,
    "--crayola-blue: var(--viking-teal-600)",
  ],
  [/--blue-bell:\s*#[0-9a-fA-F]{3,8}/g, "--blue-bell: var(--viking-teal-400)"],
  [
    /--golden-pollen:\s*#[0-9a-fA-F]{3,8}/g,
    "--golden-pollen: var(--viking-gold-500)",
  ],
  [
    /--carrot-orange:\s*#[0-9a-fA-F]{3,8}/g,
    "--carrot-orange: var(--viking-crimson-500)",
  ],
];

/** Material class / token patterns to replace. */
const MATERIAL_CLASS_REPLACEMENTS = [
  [/\bmat-mdc-raised-button\b/g, "viking-button"],
  [/\bmat-mdc-outlined-button\b/g, "viking-button viking-button--outline"],
  [/\bmat-mdc-button\b/g, "viking-button"],
  [/\bmat-primary\b/g, "viking-button--primary"],
  [/\bmat-accent\b/g, "viking-button--secondary"],
  [/\bmat-typography\b/g, "viking-ui-body"],
  [/\bmdc-button\b/g, "viking-button"],
];

/** Meta tag brand standardization (THEME.md + marketing Layout.astro). */
const META_REPLACEMENTS = [
  [
    /<meta\s+name="theme-color"\s+content="#121212"\s+media="\(prefers-color-scheme:\s*dark\)"\s*\/?>/gi,
    '<meta name="theme-color" content="#111111" media="(prefers-color-scheme: dark)" />',
  ],
  [
    /<meta\s+property="og:site_name"\s+content="DEML APP"\s*\/?>/gi,
    '<meta property="og:site_name" content="DEML (DATA ENGINEERING FOR MACHINE LEARNING)" />',
  ],
];

const CRITICAL_THEME_BLOCK = `    <!-- Critical theme tokens — prevent Material default purple flash before bundles load -->
    <style>
      :root,
      html[data-theme='light'] {
        --crayola-blue: #2176ff;
        --blue-bell: #33a1fd;
        --golden-pollen: #fdca40;
        --carrot-orange: #f79824;
        --jet-black: #31393c;
        --white: #ffffff;
        --mat-sys-primary: #2176ff;
        --mat-sys-on-primary: #ffffff;
        --mat-sys-primary-container: #33a1fd;
        --mat-sys-tertiary: #fdca40;
        --mat-sys-error: #f79824;
      }
      html[data-theme='dark'] {
        --mat-sys-on-primary-container: #ffffff;
      }
    </style>`;

const CRITICAL_THEME_REPLACEMENT = `    <!-- Critical Viking-UI tokens — prevent flash before bundles load (THEME.md v2) -->
    <style>
      :root,
      html[data-theme='light'],
      html[data-theme='dark'] {
        --viking-teal-600: #0d7377;
        --viking-teal-400: #14a3a8;
        --viking-gold-500: #c4a035;
        --viking-crimson-500: #a83344;
        --viking-charcoal-900: #111111;
        --viking-white-pure: #ffffff;
        --color-primary: var(--viking-teal-600);
        --bg-color: var(--viking-charcoal-900);
        --text-color: var(--viking-white);
      }
    </style>`;

const SKIP_LINK_BLOCK = `    <!-- Critical skip-link styles: axe pre-commit scans this file without Angular bundles. -->
    <style>
      a.skip-link {
        position: absolute;
        top: 0;
        left: 16px;
        z-index: 10000;
        padding: 8px 16px;
        border-radius: 8px;
        background-color: #000000;
        color: #ffffff;
        text-decoration: none;
        font-weight: 600;
        font-size: 16px;
        line-height: 1.4;
        clip: rect(0 0 0 0);
        clip-path: inset(50%);
        width: 1px;
        height: 1px;
        overflow: hidden;
        white-space: nowrap;
        border: 0;
      }

      a.skip-link:focus,
      a.skip-link:focus-visible {
        clip: auto;
        clip-path: none;
        width: auto;
        height: auto;
        overflow: visible;
        white-space: normal;
        outline: 3px solid #2176ff;
        outline-offset: 2px;
      }
    </style>`;

const SKIP_LINK_REPLACEMENT = `    <!-- Critical skip-link styles: axe pre-commit scans this file without Angular bundles. -->
    <style>
      a.skip-link {
        position: absolute;
        top: 0;
        left: var(--viking-space-2, 16px);
        z-index: 10000;
        padding: var(--viking-space-1, 8px) var(--viking-space-2, 16px);
        border-radius: var(--viking-radius, 8px);
        background-color: var(--viking-black, #000000);
        color: var(--viking-white-pure, #ffffff);
        text-decoration: none;
        font-weight: var(--viking-font-weight-semibold, 600);
        font-size: var(--viking-font-size-base, 16px);
        line-height: var(--viking-line-height-normal, 1.4);
        clip: rect(0 0 0 0);
        clip-path: inset(50%);
        width: 1px;
        height: 1px;
        overflow: hidden;
        white-space: nowrap;
        border: 0;
      }

      a.skip-link:focus,
      a.skip-link:focus-visible {
        clip: auto;
        clip-path: none;
        width: auto;
        height: auto;
        overflow: visible;
        white-space: normal;
        outline: var(--viking-ring-width, 2px) solid var(--viking-ring, #14a3a8);
        outline-offset: var(--viking-ring-offset, 2px);
      }
    </style>`;

/** @type {{ findings: Array<{ rule: string; file: string; line?: number; message: string }>; fixes: Array<{ file: string; rule: string; count: number }> }} */
const report = { findings: [], fixes: [] };

/**
 * @param {string} dir
 * @param {string[]} acc
 * @returns {string[]}
 */
const collectFiles = (dir, acc = []) => {
  if (!isWithinWorkspace(dir) || !fs.existsSync(dir)) {
    return acc;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
    const entryPath = path.join(dir, path.basename(entry.name));
    if (!isWithinWorkspace(entryPath)) {
      continue;
    }
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) {
        continue;
      }
      collectFiles(entryPath, acc);
      continue;
    }
    if (!SCANNABLE_EXTENSIONS.test(entry.name)) {
      continue;
    }
    if (SKIP_FILE_PATTERNS.some((pattern) => pattern.test(entryPath))) {
      continue;
    }
    acc.push(entryPath);
  }
  return acc;
};

/**
 * @param {string} filePath
 * @returns {string}
 */
const relativePath = (filePath) => path.relative(WORKSPACE_ROOT, filePath);

/**
 * @param {string} rule
 * @param {string} filePath
 * @param {string} message
 * @param {number} [line]
 */
const addFinding = (rule, filePath, message, line) => {
  report.findings.push({ rule, file: relativePath(filePath), line, message });
};

/**
 * @param {string} content
 * @param {number} index
 * @returns {number}
 */
const lineNumberAt = (content, index) =>
  content.slice(0, index).split("\n").length;

/**
 * @param {string} filePath
 * @returns {boolean}
 */
const isTokenDefinitionFile = (filePath) =>
  TOKEN_DEFINITION_FILE.test(filePath);

/**
 * @param {string} content
 * @param {number} index
 * @returns {boolean}
 */
const isPrintContext = (content, index) => {
  const before = content.slice(Math.max(0, index - 400), index);
  return /@media\s+print/i.test(before);
};

/**
 * @param {string} filePath
 * @returns {boolean}
 */
const isBrandMulticolorSvg = (filePath) =>
  /[/\\]icon\.ts$/.test(filePath) ||
  /google|oauth|brand|orcid|whitepaper/i.test(filePath);

/**
 * @param {string} content
 * @param {string} filePath
 * @param {string} rule
 * @returns {string}
 */
const fixLegacyVars = (content, filePath, rule = "legacy-css-vars") => {
  let updated = content;
  let count = 0;
  for (const [pattern, replacement] of LEGACY_VAR_REPLACEMENTS) {
    const matches = updated.match(pattern);
    if (matches) {
      count += matches.length;
      updated = updated.replace(pattern, replacement);
    }
  }
  if (count > 0) {
    report.fixes.push({ file: relativePath(filePath), rule, count });
  }
  return updated;
};

/**
 * @param {string} content
 * @param {string} filePath
 * @returns {string}
 */
const fixLegacyHex = (content, filePath) => {
  if (
    isTokenDefinitionFile(filePath) ||
    /color-picker\.ts$/i.test(filePath) ||
    /footer\.(ts|astro)$/i.test(filePath) ||
    /widget\.(js|css)$/i.test(filePath) ||
    /index\.html$/i.test(filePath)
  ) {
    return content;
  }
  let updated = content;
  let count = 0;
  const entries = [...LEGACY_HEX_TO_VAR.entries()].sort(
    ([a], [b]) => b.length - a.length,
  );
  for (const [hex, token] of entries) {
    const escaped = hex.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(escaped, "g");
    const before = updated;
    updated = updated.replace(pattern, token);
    if (updated !== before) {
      count += (before.match(pattern) || []).length;
    }
  }
  if (count > 0) {
    report.fixes.push({
      file: relativePath(filePath),
      rule: "legacy-hex-to-var",
      count,
    });
  }
  return updated;
};

/**
 * @param {string} content
 * @param {string} filePath
 * @returns {string}
 */
const fixMaterialClasses = (content, filePath) => {
  if (!/\.(html|astro|scss|css)$/i.test(filePath)) {
    return content;
  }
  let updated = content;
  let count = 0;
  for (const [pattern, replacement] of MATERIAL_CLASS_REPLACEMENTS) {
    const matches = updated.match(pattern);
    if (matches) {
      count += matches.length;
      updated = updated.replace(pattern, replacement);
    }
  }
  if (count > 0) {
    report.fixes.push({
      file: relativePath(filePath),
      rule: "material-classes",
      count,
    });
  }
  return updated;
};

/**
 * @param {string} content
 * @param {string} filePath
 * @returns {string}
 */
const fixMetaTags = (content, filePath) => {
  if (!/\.(html|astro)$/i.test(filePath)) {
    return content;
  }
  let updated = content;
  let count = 0;
  for (const [pattern, replacement] of META_REPLACEMENTS) {
    const before = updated;
    updated = updated.replace(pattern, replacement);
    if (updated !== before) {
      count += 1;
    }
  }
  if (count > 0) {
    report.fixes.push({
      file: relativePath(filePath),
      rule: "meta-brand",
      count,
    });
  }
  return updated;
};

/**
 * @param {string} content
 * @param {string} filePath
 * @returns {string}
 */
const fixSeriesColorPicker = (content, filePath) => {
  let updated = content;
  let count = 0;

  if (/\.(html|astro)$/i.test(filePath)) {
    const standaloneColorInput = /<input[^>]*type=["']color["'][^>]*\/?>/gi;
    if (
      standaloneColorInput.test(content) &&
      !content.includes("viking-color-picker")
    ) {
      addFinding(
        "series-color",
        filePath,
        'Standalone <input type="color"> detected — use <viking-color-picker /> with Series color label',
      );
      updated = updated.replace(
        standaloneColorInput,
        '<viking-color-picker aria-label="Series color" />',
      );
      count += 1;
    }
  }

  if (/color-picker\.ts$/i.test(filePath)) {
    const offPalettePreset =
      /readonly\s+presets\s*=\s*input<string\[\]>\(\[\s*([^\]]+)\]/;
    const match = updated.match(offPalettePreset);
    if (match) {
      const presetsBlock = match[1];
      const hexes = presetsBlock.match(/#[0-9a-fA-F]{3,8}/g) || [];
      const normalized = hexes.map((h) => h.toLowerCase());
      const mismatch = normalized.some((hex, i) => hex !== SERIES_PRESETS[i]);
      if (mismatch) {
        addFinding(
          "series-color",
          filePath,
          "Color picker presets diverge from THEME.md §8.4",
        );
        updated = updated.replace(
          offPalettePreset,
          `readonly presets = input<string[]>([\n    '${SERIES_PRESETS.join("',\n    '")}',\n  ]`,
        );
        count += 1;
      }
    }
  }

  if (count > 0) {
    report.fixes.push({
      file: relativePath(filePath),
      rule: "series-color",
      count,
    });
  }
  return updated;
};

/**
 * @param {string} content
 * @param {string} filePath
 * @returns {string}
 */
const fixSvgIcons = (content, filePath) => {
  if (!filePath.endsWith(".svg") || isBrandMulticolorSvg(filePath)) {
    return content;
  }

  let updated = content.trim();
  let count = 0;

  if (!/<svg[^>]*xmlns=/i.test(updated)) {
    updated = updated.replace(
      "<svg",
      '<svg xmlns="http://www.w3.org/2000/svg"',
    );
    count += 1;
  }

  const hardcodedFill = updated.match(/\bfill=["']#([0-9a-fA-F]{3,8})["']/g);
  if (hardcodedFill) {
    for (const fill of hardcodedFill) {
      addFinding(
        "svg-icon",
        filePath,
        `Hardcoded SVG fill ${fill} — prefer currentColor`,
      );
    }
    updated = updated.replace(
      /\bfill=["']#([0-9a-fA-F]{3,8})["']/g,
      'fill="currentColor"',
    );
    count += hardcodedFill.length;
  }

  const hardcodedStroke = updated.match(
    /\bstroke=["']#([0-9a-fA-F]{3,8})["']/g,
  );
  if (hardcodedStroke) {
    for (const stroke of hardcodedStroke) {
      addFinding(
        "svg-icon",
        filePath,
        `Hardcoded SVG stroke ${stroke} — prefer currentColor`,
      );
    }
    updated = updated.replace(
      /\bstroke=["']#([0-9a-fA-F]{3,8})["']/g,
      'stroke="currentColor"',
    );
    count += hardcodedStroke.length;
  }

  if (
    !/\bstroke=["']currentColor["']/i.test(updated) &&
    /<path|<line|<circle|<rect/.test(updated)
  ) {
    if (!/\bstroke=/.test(updated)) {
      updated = updated.replace("<svg", '<svg stroke="currentColor"');
      count += 1;
    }
  }

  const viewBoxMatch = updated.match(
    /viewBox=["']0\s+0\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)["']/,
  );
  if (viewBoxMatch && !/\bwidth=/.test(updated)) {
    const size = Math.max(Number(viewBoxMatch[1]), Number(viewBoxMatch[2]));
    const normalized = [16, 20, 24].includes(size) ? size : 24;
    updated = updated.replace(
      "<svg",
      `<svg width="${normalized}" height="${normalized}"`,
    );
    count += 1;
  }

  if (!/\bfill=["']none["']/i.test(updated) && /\bstroke=/.test(updated)) {
    updated = updated.replace("<svg", '<svg fill="none"');
    count += 1;
  }

  if (count > 0) {
    report.fixes.push({
      file: relativePath(filePath),
      rule: "svg-icon",
      count,
    });
  }
  return updated;
};

/**
 * @param {string} content
 * @param {string} filePath
 * @returns {string}
 */
const fixIndexHtmlBlocks = (content, filePath) => {
  if (!/index\.html$/.test(filePath)) {
    return content;
  }
  let updated = content;
  let count = 0;
  if (updated.includes(CRITICAL_THEME_BLOCK)) {
    updated = updated.replace(CRITICAL_THEME_BLOCK, CRITICAL_THEME_REPLACEMENT);
    count += 1;
  }
  if (updated.includes(SKIP_LINK_BLOCK)) {
    updated = updated.replace(SKIP_LINK_BLOCK, SKIP_LINK_REPLACEMENT);
    count += 1;
  }
  if (count > 0) {
    report.fixes.push({
      file: relativePath(filePath),
      rule: "critical-theme-block",
      count,
    });
  }
  return updated;
};

/**
 * @param {string} content
 * @param {string} filePath
 */
const scanHardcodedHex = (content, filePath) => {
  if (isTokenDefinitionFile(filePath)) {
    return;
  }
  const hexPattern = /#([0-9a-fA-F]{3,8})\b/g;
  let match;
  while ((match = hexPattern.exec(content)) !== null) {
    const hex = `#${match[1]}`.toLowerCase();
    if (PALETTE_HEX.has(hex)) {
      continue;
    }
    if (isPrintContext(content, match.index)) {
      continue;
    }
    if (LEGACY_HEX_TO_VAR.has(hex) || LEGACY_HEX_TO_VAR.has(`#${match[1]}`)) {
      continue;
    }
    addFinding(
      "hardcoded-hex",
      filePath,
      `Off-palette hex ${hex} — use --viking-* CSS variables per THEME.md`,
      lineNumberAt(content, match.index),
    );
  }
};

/**
 * @param {string} content
 * @param {string} filePath
 */
const scanMaterialTokens = (content, filePath) => {
  const matHex = /--mat-sys-[a-z-]+:\s*(#[0-9a-fA-F]{3,8})/gi;
  let match;
  while ((match = matHex.exec(content)) !== null) {
    const hex = match[1].toLowerCase();
    if (["#ffffff", "#fff"].includes(hex)) {
      continue;
    }
    addFinding(
      "material-tokens",
      filePath,
      `Legacy Material token ${match[0]} — map to --viking-* per THEME.md`,
      lineNumberAt(content, match.index),
    );
  }
};

/**
 * @param {string} content
 * @param {string} filePath
 */
const scanLegacyPaletteNames = (content, filePath) => {
  const legacyNames = [
    "--jet-black",
    "--crayola-blue",
    "--blue-bell",
    "--golden-pollen",
    "--carrot-orange",
    "jet-black",
    "crayola-blue",
    "Lab Coat",
  ];
  for (const name of legacyNames) {
    if (content.includes(name) && !isTokenDefinitionFile(filePath)) {
      const index = content.indexOf(name);
      addFinding(
        "legacy-palette",
        filePath,
        `Legacy Lab Coat reference "${name}" — use --viking-* tokens`,
        lineNumberAt(content, index),
      );
    }
  }
};

/**
 * @param {string} content
 * @param {string} filePath
 */
const scanInlineStyles = (content, filePath) => {
  if (!/\.(html|astro|ts)$/i.test(filePath)) {
    return;
  }
  const styleAttr = /style=["'][^"']*(#[0-9a-fA-F]{3,8}|rgb\s*\()/gi;
  let match;
  while ((match = styleAttr.exec(content)) !== null) {
    addFinding(
      "inline-style",
      filePath,
      "Inline hardcoded color in style attribute — prefer CSS variables",
      lineNumberAt(content, match.index),
    );
  }
};

/**
 * @param {string} content
 * @param {string} filePath
 */
const scanFooterBrand = (content, filePath) => {
  if (!/footer|index\.html|Layout\.astro/i.test(filePath)) {
    return;
  }
  if (
    /©\s*20\d{2}\s+DEML\s+App/i.test(content) &&
    !/Data Engineering for Machine Learning/i.test(content)
  ) {
    addFinding(
      "footer-brand",
      filePath,
      'Footer copyright should reference "Data Engineering for Machine Learning"',
    );
  }
};

/**
 * Validate THEME.md tokens exist in _variables.scss.
 */
const validateThemeMd = () => {
  const themePath = path.join(WORKSPACE_ROOT, "THEME.md");
  const variablesPath = path.join(
    WORKSPACE_ROOT,
    "frontend/projects/viking-ui/src/styles/_variables.scss",
  );
  if (!fs.existsSync(themePath) || !fs.existsSync(variablesPath)) {
    addFinding("theme-md", themePath, "THEME.md or _variables.scss missing");
    return;
  }
  const theme = fs.readFileSync(themePath, "utf8");
  const variables = fs.readFileSync(variablesPath, "utf8");
  const tokenPattern = /--viking-[a-z0-9-]+/g;
  const themeTokens = new Set(theme.match(tokenPattern) || []);
  for (const token of themeTokens) {
    if (!variables.includes(token)) {
      addFinding(
        "theme-md",
        variablesPath,
        `Token ${token} documented in THEME.md but missing from _variables.scss`,
      );
    }
  }
};

/**
 * @param {string} content
 * @param {string} filePath
 * @returns {string}
 */
const applyFixes = (content, filePath) => {
  let updated = content;
  updated = fixLegacyVars(updated, filePath);
  updated = fixLegacyHex(updated, filePath);
  updated = fixMaterialClasses(updated, filePath);
  updated = fixMetaTags(updated, filePath);
  updated = fixSeriesColorPicker(updated, filePath);
  updated = fixSvgIcons(updated, filePath);
  updated = fixIndexHtmlBlocks(updated, filePath);
  return updated;
};

/**
 * @param {string} content
 * @param {string} filePath
 */
const scanFile = (content, filePath) => {
  scanHardcodedHex(content, filePath);
  scanMaterialTokens(content, filePath);
  scanLegacyPaletteNames(content, filePath);
  scanInlineStyles(content, filePath);
  scanFooterBrand(content, filePath);
};

/**
 * @param {string} filePath
 */
const processFile = (filePath) => {
  const original = fs.readFileSync(filePath, "utf8");
  scanFile(original, filePath);
  if (!apply) {
    return;
  }
  const updated = applyFixes(original, filePath);
  if (updated !== original) {
    fs.writeFileSync(filePath, updated, "utf8");
  }
};

const main = () => {
  console.log(
    `\n=== DEML Viking-UI Theme Cleanup (${apply ? "APPLY" : "DRY-RUN"}) ===\n`,
  );

  const files = RESOLVED_SCAN_ROOTS.flatMap((root) => collectFiles(root));
  const uniqueFiles = [...new Set(files)].filter(fs.existsSync);

  console.log(
    `Scanning ${uniqueFiles.length} files across ${SCAN_ROOTS.length} property roots...\n`,
  );

  for (const filePath of uniqueFiles) {
    processFile(filePath);
  }

  validateThemeMd();

  const findingsByRule = report.findings.reduce((acc, item) => {
    acc[item.rule] = (acc[item.rule] || 0) + 1;
    return acc;
  }, /** @type {Record<string, number>} */ ({}));

  if (report.findings.length > 0) {
    console.log("Findings:");
    const grouped = new Map();
    for (const finding of report.findings) {
      const key = `${finding.file}:${finding.rule}:${finding.message}`;
      if (!grouped.has(key)) {
        grouped.set(key, finding);
      }
    }
    for (const finding of grouped.values()) {
      const loc = finding.line ? `:${finding.line}` : "";
      console.log(`  [${finding.rule}] ${finding.file}${loc}`);
      console.log(`    ${finding.message}`);
      if (verbose) {
        console.log("");
      }
    }
    console.log("");
    console.log("Summary by rule:");
    for (const [rule, count] of Object.entries(findingsByRule)) {
      console.log(`  ${rule}: ${count}`);
    }
    console.log(`\nTotal findings: ${report.findings.length}`);
  } else {
    console.log("No theme violations found.");
  }

  if (apply && report.fixes.length > 0) {
    console.log("\nApplied fixes:");
    for (const fix of report.fixes) {
      console.log(
        `  [${fix.rule}] ${fix.file} (${fix.count} change${fix.count === 1 ? "" : "s"})`,
      );
    }
    console.log(
      `\nTotal fix operations: ${report.fixes.reduce((n, f) => n + f.count, 0)}`,
    );
  } else if (!apply && report.findings.length > 0) {
    console.log("\nRun with --apply to apply safe automatic fixes.");
  }

  console.log("\nReference: THEME.md — Viking-UI premium palette v2\n");

  if (report.findings.length > 0 && !apply) {
    process.exit(1);
  }
  process.exit(0);
};

main();
