const axeSource = require("axe-core").source;
const { chromium } = require("playwright");
const path = require("path");

const SKIP_AXE = [/[/\\]swagger\.html$/i, /[/\\]node_modules[/\\]/];

const files = process.argv
  .slice(2)
  .filter((file) => !SKIP_AXE.some((pattern) => pattern.test(file)));

if (files.length === 0) {
  process.exit(0);
}

const workspaceRoot = path.resolve(__dirname, "..");

const urls = files.map((file) => {
  // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
  const absolutePath = path.resolve(file);
  if (!absolutePath.startsWith(workspaceRoot)) {
    throw new Error(`Access denied: ${file} is outside workspace`);
  }
  return `file://${absolutePath}`;
});

const disabledRules = [
  "document-title",
  "html-has-lang",
  "landmark-one-main",
  "page-has-heading-one",
  "region",
];

const run = async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const violations = [];

  try {
    for (const url of urls) {
      const page = await browser.newPage();
      // nosemgrep: javascript.playwright.security.audit.playwright-goto-injection.playwright-goto-injection
      await page.goto(url, { waitUntil: "load" });
      await page.addScriptTag({ content: axeSource });
      const result = await page.evaluate((rules) => {
        const axeOptions = {
          rules: Object.fromEntries(
            rules.map((rule) => [rule, { enabled: false }]),
          ),
        };
        return window.axe.run(document, axeOptions);
      }, disabledRules);

      for (const violation of result.violations) {
        violations.push({ url, violation });
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }

  if (violations.length > 0) {
    console.error(
      `axe-core found ${violations.length} accessibility violation group(s).`,
    );
    for (const { url, violation } of violations) {
      console.error(`\n${url}`);
      console.error(`${violation.id}: ${violation.help}`);
      console.error(`Impact: ${violation.impact ?? "unknown"}`);
      for (const node of violation.nodes) {
        console.error(`- ${node.target.join(", ")}`);
        console.error(
          `  ${node.failureSummary ?? "No failure summary available."}`,
        );
      }
    }
    process.exit(2);
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
