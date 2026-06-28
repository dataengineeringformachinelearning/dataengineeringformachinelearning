const { spawnSync } = require("child_process");
const path = require("path");

const files = process.argv.slice(2);
if (files.length === 0) {
  process.exit(0);
}

const workspaceRoot = path.resolve(__dirname, "..");

const BASE_DISABLED_RULES = [
  "document-title",
  "html-has-lang",
  "landmark-one-main",
  "page-has-heading-one",
  "region",
];

/** SPA shell files are scanned without Angular CSS; skip-link contrast is validated separately. */
const SHELL_HTML_PATTERN = /(?:^|\/)index\.html$/;

const toFileUrl = (file) => {
  // nosemgrep: javascript.lang.security.audit.path-traversal.path-join-resolve-traversal.path-join-resolve-traversal
  const absolutePath = path.resolve(file);
  if (!absolutePath.startsWith(workspaceRoot)) {
    throw new Error(`Access denied: ${file} is outside workspace`);
  }
  return `file://${absolutePath}`;
};

const runAxe = (fileList, extraDisabledRules = []) => {
  if (fileList.length === 0) {
    return 0;
  }

  const disabledRules = [...BASE_DISABLED_RULES, ...extraDisabledRules].join(
    ",",
  );

  const result = spawnSync(
    "npx",
    [
      "-y",
      "@axe-core/cli",
      ...fileList.map(toFileUrl),
      "--exit",
      "--disable",
      disabledRules,
    ],
    { stdio: "inherit" },
  );

  return result.status ?? 1;
};

const shellFiles = files.filter((file) => SHELL_HTML_PATTERN.test(file));
const componentFiles = files.filter((file) => !SHELL_HTML_PATTERN.test(file));

// Component fragments: full axe ruleset (including color-contrast).
let exitCode = runAxe(componentFiles);

// SPA shell: disable color-contrast — off-screen skip links and async analytics
// injectors are not representative of the hydrated Angular app.
if (shellFiles.length > 0) {
  const shellExitCode = runAxe(shellFiles, ["color-contrast"]);
  if (shellExitCode !== 0) {
    exitCode = shellExitCode;
  }
}

if (exitCode !== 0) {
  process.exit(exitCode);
}
