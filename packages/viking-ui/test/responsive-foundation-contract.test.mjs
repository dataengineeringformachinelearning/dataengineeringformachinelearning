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

test("foundation breakpoint tokens use the canonical four tiers", () => {
  const theme = readPackageFile("src", "styles", "theme.scss");
  const variables = readPackageFile("src", "styles", "_variables.scss");

  assert.match(
    theme,
    /\$breakpoints:\s*\(\s*sm:\s*640px,\s*md:\s*768px,\s*sidebar:\s*1024px,\s*lg:\s*1024px,\s*xl:\s*1280px,\s*2xl:\s*1280px,/s,
  );
  assert.match(variables, /--viking-bp-sm:\s*640px/);
  assert.match(variables, /--viking-bp-md:\s*768px/);
  assert.match(variables, /--viking-bp-sidebar:\s*1024px/);
  assert.match(variables, /--viking-bp-lg:\s*1024px/);
  assert.match(variables, /--viking-bp-xl:\s*1280px/);
  assert.match(variables, /--viking-bp-2xl:\s*1280px/);
});

test("navbar container tiers are mobile-first and canonical", () => {
  const navbar = readPackageFile("src", "styles", "static-navbar.scss");

  assert.match(navbar, /@container viking-navbar \(min-width:\s*768px\)/);
  assert.match(navbar, /@container viking-navbar \(min-width:\s*1280px\)/);
  assert.doesNotMatch(navbar, /@container[^{]*max-width/);
  assert.match(
    navbar,
    /@container viking-navbar \(min-width:\s*1280px\)\s*\{[\s\S]*?\.nav-btn > span\s*\{[\s\S]*?position:\s*static;[\s\S]*?width:\s*auto;[\s\S]*?height:\s*auto;[\s\S]*?margin:\s*0;[\s\S]*?overflow:\s*visible;[\s\S]*?clip:\s*auto;/,
  );
});

test("the canonical XL gutter has a single effective declaration", () => {
  const layoutShell = readPackageFile("src", "styles", "layout-shell.scss");
  const globalXlGutter =
    /@media \(min-width:\s*1280px\)\s*\{\s*\.viking-page-shell,\s*\.page-inner-wrapper,\s*\.viking-page-container,\s*\.viking-section-inner\s*\{[\s\S]*?padding-inline:\s*var\(--viking-page-gutter-xl,/;

  assert.match(layoutShell, globalXlGutter);
  assert.doesNotMatch(
    layoutShell,
    /@media \(min-width:\s*1280px\)\s*\{\s*\.viking-page-shell,\s*\.page-inner-wrapper,\s*\.viking-page-container,\s*\.viking-section-inner\s*\{[\s\S]*?padding-inline:\s*var\(--viking-page-gutter-lg,/,
  );
});
