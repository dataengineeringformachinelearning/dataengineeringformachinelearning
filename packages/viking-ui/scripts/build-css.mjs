import { execFileSync } from "node:child_process";
import {
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
const outDir = path.join(packageDir, "dist");
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

const compile = (entry) => {
  const outFile = path.join(outDir, `${entry}.tmp.css`);
  execFileSync(
    sassBin,
    [
      "--style=expanded",
      "--no-source-map",
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

const tokensCss = compile("tokens.scss");
const componentsCss = compile("components.scss");
const bundleCss = [
  "/*! Viking-UI universal bundle. Source: packages/viking-ui. */",
  tokensCss,
  componentsCss,
].join("\n\n");

writeFileSync(path.join(outDir, "design-tokens.css"), tokensCss);
writeFileSync(path.join(outDir, "viking-components.css"), componentsCss);
writeFileSync(path.join(outDir, "viking-ui.css"), bundleCss);

console.log(`Built Viking-UI CSS in ${outDir}`);
