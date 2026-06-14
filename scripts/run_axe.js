const { spawnSync } = require("child_process");
const path = require("path");

const files = process.argv.slice(2);
if (files.length === 0) {
  process.exit(0);
}

// Convert files to absolute file:// URLs
const urls = files.map((file) => {
  // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
  const absolutePath = path.resolve(file);
  const workspaceRoot = path.resolve(__dirname, "..");
  if (!absolutePath.startsWith(workspaceRoot)) {
    throw new Error(`Access denied: ${file} is outside workspace`);
  }
  return `file://${absolutePath}`;
});

// Run axe-core CLI with the URLs
// We use spawnSync to avoid shell parsing and prevent Command Injection (CWE-78)
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
