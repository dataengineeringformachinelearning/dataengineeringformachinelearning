import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const readPackageFile = (...segments) =>
  readFileSync(path.join(packageDir, ...segments), "utf8");

const responsiveFiles = [
  ["src", "lib", "form-section", "form-section.ts"],
  ["src", "lib", "uptime-history", "uptime-history.ts"],
  ["src", "lib", "toast", "toast.ts"],
  ["src", "lib", "search-palette", "search-palette.scss"],
  ["src", "lib", "status-section", "status-section.ts"],
  ["src", "lib", "app-sidebar", "app-sidebar.scss"],
  ["src", "lib", "explore-card", "explore-card.ts"],
  ["src", "lib", "tabs", "tabs.ts"],
  ["src", "lib", "tabs", "tab.ts"],
  ["src", "lib", "sidebar-nav", "sidebar-nav.scss"],
  ["src", "lib", "split-panel", "split-panel.ts"],
  ["src", "web", "suite-header", "viking-suite-header-wc.ts"],
];

test("responsive components use canonical mobile-first breakpoints", () => {
  const allowedBreakpoints = new Set([640, 768, 1024, 1280]);

  for (const segments of responsiveFiles) {
    const source = readPackageFile(...segments);
    const file = segments.join("/");
    for (const query of source.matchAll(/@(media|container)\b[^{]*/g)) {
      for (const width of query[0].matchAll(
        /\(\s*(min|max)-width\s*:\s*(\d+(?:\.\d+)?)\s*(px|r?em)\s*\)/g,
      )) {
        assert.equal(width[1], "min", `${file} must not use max-width queries`);
        const pixels =
          width[3].toLowerCase() === "px"
            ? Number(width[2])
            : Number(width[2]) * 16;
        assert.ok(
          allowedBreakpoints.has(pixels),
          `${file} uses noncanonical ${width[2]}${width[3]}`,
        );
      }
    }
  }
});

test("narrow layouts are the base and wider layouts are enhancements", () => {
  const appLayout = readPackageFile(
    "src",
    "lib",
    "app-layout",
    "app-layout.ts",
  );
  const tabs = readPackageFile("src", "lib", "tabs", "tabs.ts");
  const toast = readPackageFile("src", "lib", "toast", "toast.ts");
  const splitPanel = readPackageFile(
    "src",
    "lib",
    "split-panel",
    "split-panel.ts",
  );
  const statusSection = readPackageFile(
    "src",
    "lib",
    "status-section",
    "status-section.ts",
  );

  assert.match(appLayout, /window\.matchMedia\("\(min-width: 1024px\)"\)/);
  assert.doesNotMatch(
    appLayout,
    /window\.matchMedia\("\(min-width: 901px\)"\)/,
  );
  assert.match(
    tabs,
    /\.viking-tabs-list\s*\{[\s\S]*?flex-wrap:\s*nowrap;[\s\S]*?overflow-x:\s*auto;/,
  );
  assert.match(tabs, /@media \(min-width: 768px\)[\s\S]*?flex-wrap:\s*wrap;/);
  assert.match(toast, /:host\s*\{[\s\S]*?left:\s*var\(--viking-space-2\);/);
  assert.match(toast, /@media \(min-width: 768px\)[\s\S]*?left:\s*auto;/);
  assert.match(splitPanel, /\.viking-split-panel\s*\{[\s\S]*?width:\s*100vw;/);
  assert.match(
    splitPanel,
    /@media \(min-width: 640px\)[\s\S]*?width:\s*var\(--viking-split-panel-width, 480px\);/,
  );
  assert.match(
    statusSection,
    /\.viking-status-section-title\s*\{[\s\S]*?font-size:\s*var\(--viking-font-size-xl\);/,
  );
  assert.match(
    statusSection,
    /@media \(min-width: 768px\)[\s\S]*?font-size:\s*var\(--viking-font-size-2xl\);/,
  );
});
