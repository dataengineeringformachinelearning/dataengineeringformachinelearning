import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const packageDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const styles = readFileSync(
  path.join(packageDir, "src", "styles", "components", "whitepaper-cta.scss"),
  "utf8",
);

test("whitepaper CTA exposes a tokenized, reduced-motion-safe border tracer", () => {
  assert.match(styles, /@property --viking-whitepaper-trace-angle/);
  assert.match(styles, /background:\s*conic-gradient\(/);
  assert.match(
    styles,
    /animation:\s*vikingWhitepaperBorderTrace\s*calc\(var\(--viking-duration-slow\) \* 18\)/,
  );
  assert.match(
    styles,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.viking-whitepaper-cta::after[\s\S]*animation:\s*none;/,
  );
  assert.match(
    styles,
    /\.viking-whitepaper-tag[\s\S]*border-radius:\s*var\(--viking-radius-pill\);/,
  );
});
