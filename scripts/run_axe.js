const { spawnSync } = require("child_process");
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

const result = spawnSync(
  "npx",
  [
    "-y",
    "@axe-core/cli",
    ...urls,
    "--exit",
    "--disable",
    "document-title,html-has-lang,landmark-one-main,page-has-heading-one,region",
  ],
  { stdio: "inherit" },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
