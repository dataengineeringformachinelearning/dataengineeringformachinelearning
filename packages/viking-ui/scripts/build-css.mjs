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
const fontSourceDir = path.join(
  rootDir,
  "frontend",
  "projects",
  "viking-ui",
  "assets",
  "fonts",
  "inter",
);
const fontOutDir = path.join(outDir, "fonts", "inter");
const localSass = path.join(packageDir, "node_modules", ".bin", "sass");
const designSystemSass = path.join(
  rootDir,
  "packages",
  "deml-design-system",
  "node_modules",
  ".bin",
  "sass",
);
const docsSass = path.join(
  rootDir,
  "viking-ui-docs",
  "node_modules",
  ".bin",
  "sass",
);
const sassBin = existsSync(localSass)
  ? localSass
  : existsSync(designSystemSass)
    ? designSystemSass
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

const tokensCss = compile("tokens-export.scss");
const componentsCss = compile("components-bundle.scss");
const demlComponentsCss = compile("deml-components.scss");
const bundleCss = compile("viking-ui-bundle.scss", "compressed");

writeFileSync(path.join(outDir, "design-tokens.css"), tokensCss);
writeFileSync(path.join(outDir, "viking-components.css"), componentsCss);
writeFileSync(path.join(outDir, "deml-components.css"), demlComponentsCss);
writeFileSync(path.join(outDir, "viking-ui.css"), bundleCss);
copyFileSync(tokensJson, path.join(outDir, "viking-tokens.json"));

if (!existsSync(fontSourceDir)) {
  throw new Error(`Expected Inter font source missing: ${fontSourceDir}`);
}
mkdirSync(fontOutDir, { recursive: true });
cpSync(fontSourceDir, fontOutDir, { recursive: true });

console.log(`Built Viking-UI CSS in ${outDir}`);
