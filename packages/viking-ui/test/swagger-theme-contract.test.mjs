import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryDir = path.resolve(packageDir, "..", "..");
const styles = readFileSync(
  path.join(packageDir, "src", "styles", "surfaces", "swagger-ui.scss"),
  "utf8",
);
const baseTemplate = readFileSync(
  path.join(repositoryDir, "backend", "templates", "base.html"),
  "utf8",
);
const swaggerTemplate = readFileSync(
  path.join(repositoryDir, "backend", "templates", "swagger.html"),
  "utf8",
);

test("Swagger vendor CSS loads before Viking-UI", () => {
  const vendorStylesIndex = baseTemplate.indexOf("{% block vendor_styles %}");
  const vikingStylesIndex = baseTemplate.indexOf(
    "{% static 'viking-ui.css' %}",
  );

  assert.notEqual(vendorStylesIndex, -1);
  assert.notEqual(vikingStylesIndex, -1);
  assert.ok(vendorStylesIndex < vikingStylesIndex);
  assert.match(swaggerTemplate, /{% block vendor_styles %}/);
});

test("Swagger authorization and method controls use quiet Viking surfaces", () => {
  assert.match(
    styles,
    /\.swagger-ui \.btn\.authorize,[^{]*{[^}]*background: var\([^}]*--viking-surface-raised/,
  );
  assert.match(
    styles,
    /\.swagger-ui \.opblock \.opblock-summary-method {[^}]*background: var\(--viking-surface-raised/,
  );
  assert.doesNotMatch(
    styles,
    /\.swagger-ui \.opblock\.opblock-post \.opblock-summary-method {[^}]*var\(--viking-green/,
  );
  assert.match(
    styles,
    /\.swagger-ui \.opblock-tag a {\s*color: inherit !important;/,
  );
  assert.match(
    styles,
    /\.swagger-ui \.opblock \.opblock-summary-path a,[\s\S]*color: inherit !important;/,
  );
});
