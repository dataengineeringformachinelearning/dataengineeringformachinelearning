import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const rootDir = path.join(packageDir, "..", "..");
const sourceDir = path.join(packageDir, "src", "styles");
const tokensJson = path.join(packageDir, "src", "tokens", "viking-tokens.json");
const outDir = path.join(packageDir, "dist");
const fontSourceDir = path.join(packageDir, "src", "assets", "fonts", "inter");
const fontOutDir = path.join(outDir, "fonts", "inter");
const localSass = path.join(packageDir, "node_modules", ".bin", "sass");
const docsSass = path.join(
  rootDir,
  "viking-ui-docs",
  "node_modules",
  ".bin",
  "sass",
);
const sassBin = existsSync(localSass)
  ? localSass
  : existsSync(docsSass)
    ? docsSass
    : "sass";

const compile = (entry, style = "expanded") => {
  const outFile = path.join(outDir, `${entry}.tmp.css`);
  execFileSync(
    sassBin,
    [
      `--style=${style}`,
      "--no-source-map",
      `--load-path=${sourceDir}`,
      path.join(sourceDir, entry),
      outFile,
    ],
    {
      cwd: packageDir,
      stdio: "inherit",
    },
  );
  const css = readFileSync(outFile, "utf8");
  rmSync(outFile, { force: true });
  return css;
};

mkdirSync(outDir, { recursive: true });

const suiteTokensSrc = path.join(
  packageDir,
  "src",
  "tokens",
  "suite-tokens.css",
);
const suiteComponentsSrc = path.join(
  packageDir,
  "src",
  "tokens",
  "suite-components.css",
);
const suiteLandingSrc = path.join(
  packageDir,
  "src",
  "tokens",
  "suite-landing.css",
);
const suiteBackendSrc = path.join(
  packageDir,
  "src",
  "tokens",
  "suite-backend.css",
);
const suiteDocsSrc = path.join(packageDir, "src", "tokens", "suite-docs.css");
const suiteTokensCss = readFileSync(suiteTokensSrc, "utf8");
const suiteComponentsCss = readFileSync(suiteComponentsSrc, "utf8");
const suiteLandingCss = readFileSync(suiteLandingSrc, "utf8");
const suiteBackendCss = readFileSync(suiteBackendSrc, "utf8");
const suiteDocsCss = readFileSync(suiteDocsSrc, "utf8");
// Product surfaces: tokens → components → landing → backend (docs CSS is Storybook-only)
const suiteBundle = `${suiteTokensCss}\n${suiteComponentsCss}\n${suiteLandingCss}\n${suiteBackendCss}`;

const tokensCss = `${compile("tokens-export.scss")}\n${suiteBundle}`;
const componentsCss = `${compile("components-bundle.scss")}\n${suiteComponentsCss}`;
const demlComponentsCss = compile("deml-components.scss");
// Append suite so --suite-* aliases and stage chrome win over surface SCSS.
const appCss = `${compile("viking-app.scss", "compressed")}\n${suiteBundle}`;
const bundleCss = `${compile("viking-ui-bundle.scss", "compressed")}\n${suiteBundle}`;

writeFileSync(path.join(outDir, "suite-tokens.css"), suiteTokensCss);
writeFileSync(path.join(outDir, "suite-components.css"), suiteComponentsCss);
writeFileSync(path.join(outDir, "suite-landing.css"), suiteLandingCss);
writeFileSync(path.join(outDir, "suite-backend.css"), suiteBackendCss);
writeFileSync(path.join(outDir, "suite-docs.css"), suiteDocsCss);
writeFileSync(path.join(outDir, "design-tokens.css"), tokensCss);
writeFileSync(path.join(outDir, "viking-components.css"), componentsCss);
writeFileSync(path.join(outDir, "deml-components.css"), demlComponentsCss);
writeFileSync(path.join(outDir, "viking-app.css"), appCss);
writeFileSync(path.join(outDir, "viking-ui.css"), bundleCss);
copyFileSync(tokensJson, path.join(outDir, "viking-tokens.json"));

if (!existsSync(fontSourceDir)) {
  throw new Error(`Expected Inter font source missing: ${fontSourceDir}`);
}
mkdirSync(fontOutDir, { recursive: true });
cpSync(fontSourceDir, fontOutDir, { recursive: true });

console.log(`Built Viking-UI CSS in ${outDir}`);
