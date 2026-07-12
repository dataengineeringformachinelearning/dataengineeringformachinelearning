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

test("major component categories consume the shared SaaS contracts", () => {
  const variables = readPackageFile("src", "styles", "_variables.scss");
  const forms = readPackageFile("src", "styles", "_forms.scss");
  const buttons = readPackageFile("src", "styles", "_buttons.scss");
  const table = readPackageFile("src", "lib", "table", "table.ts");
  const chart = readPackageFile("src", "lib", "chart", "chart.ts");

  assert.match(
    variables,
    /--viking-component-radius:\s*var\(--viking-radius\)/,
  );
  assert.match(variables, /--viking-component-surface-radius:/);
  assert.match(variables, /--viking-navigation-item-height:\s*40px/);
  assert.match(forms, /background:\s*var\(--viking-component-bg-inset\)/);
  assert.match(buttons, /border-radius:\s*var\(--viking-component-radius\)/);
  assert.match(table, /var\(--viking-table-cell-padding-y\)/);
  assert.match(chart, /var\(--viking-chart-ratio, 16 \/ 7\)/);
});

test("navigation polish avoids flashy base-state effects", () => {
  const header = readPackageFile("src", "lib", "app-header", "app-header.scss");
  const sidebar = readPackageFile(
    "src",
    "lib",
    "app-sidebar",
    "app-sidebar.scss",
  );

  assert.doesNotMatch(header, /transform:\s*rotate/);
  assert.doesNotMatch(header, /drop-shadow/);
  assert.doesNotMatch(sidebar, /pulse-glow/);
  assert.doesNotMatch(sidebar, /--sidebar-active-bg:\s*linear-gradient/);
});
