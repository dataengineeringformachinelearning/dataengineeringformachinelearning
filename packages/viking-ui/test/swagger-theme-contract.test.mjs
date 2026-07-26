import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryDir = path.resolve(packageDir, "..", "..");
const apidocs = readFileSync(
  path.join(packageDir, "src", "tokens", "suite-apidocs.css"),
  "utf8",
);
const swaggerTemplate = readFileSync(
  path.join(repositoryDir, "backend", "templates", "swagger.html"),
  "utf8",
);
const redocTemplate = readFileSync(
  path.join(repositoryDir, "backend", "templates", "redoc.html"),
  "utf8",
);

test("Swagger / ReDoc self-host vendor assets (no jsDelivr)", () => {
  assert.doesNotMatch(swaggerTemplate, /cdn\.jsdelivr\.net/);
  assert.doesNotMatch(redocTemplate, /cdn\.jsdelivr\.net/);
  assert.match(swaggerTemplate, /vendor\/swagger-ui-dist\/swagger-ui\.css/);
  assert.match(
    swaggerTemplate,
    /vendor\/swagger-ui-dist\/swagger-ui-bundle\.js/,
  );
  assert.match(redocTemplate, /vendor\/redoc\/redoc\.standalone\.js/);
  assert.ok(
    existsSync(
      path.join(
        repositoryDir,
        "backend/static/vendor/swagger-ui-dist/swagger-ui-bundle.js",
      ),
    ),
  );
  assert.ok(
    existsSync(
      path.join(
        repositoryDir,
        "backend/static/vendor/redoc/redoc.standalone.js",
      ),
    ),
  );
});

test("Swagger cascade: vendor CSS → viking-ui → suite-apidocs", () => {
  const vendorIndex = swaggerTemplate.indexOf("swagger-ui.css");
  const vikingIndex = swaggerTemplate.indexOf("{% static 'viking-ui.css' %}");
  const apidocsIndex = swaggerTemplate.indexOf(
    "{% static 'suite-apidocs.css' %}",
  );
  assert.notEqual(vendorIndex, -1);
  assert.notEqual(vikingIndex, -1);
  assert.notEqual(apidocsIndex, -1);
  assert.ok(vendorIndex < vikingIndex);
  assert.ok(vikingIndex < apidocsIndex);
  assert.doesNotMatch(swaggerTemplate, /<style>/);
  assert.match(swaggerTemplate, /docs-swagger-init\.js/);
});

test("suite-apidocs uses quiet method chips (token surfaces)", () => {
  assert.match(
    apidocs,
    /\.swagger-ui \.opblock \.opblock-summary-method \{[^}]*--suite-surface-2/,
  );
  assert.doesNotMatch(
    apidocs,
    /\.swagger-ui \.opblock\.opblock-post \.opblock-summary-method/,
  );
  assert.match(apidocs, /--suite-/);
});
