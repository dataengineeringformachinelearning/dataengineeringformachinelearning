import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const rootDir = path.join(packageDir, "..", "..");
const outDir = path.join(packageDir, "dist");
const entry = path.join(packageDir, "src", "web-components", "index.ts");
const widgetSource = path.join(
  rootDir,
  "frontend",
  "src",
  "assets",
  "widget.js",
);
const localEsbuild = path.join(packageDir, "node_modules", ".bin", "esbuild");
const frontendEsbuild = path.join(
  rootDir,
  "frontend",
  "node_modules",
  ".bin",
  "esbuild",
);
const esbuildBin = existsSync(localEsbuild)
  ? localEsbuild
  : existsSync(frontendEsbuild)
    ? frontendEsbuild
    : "esbuild";

mkdirSync(outDir, { recursive: true });

execFileSync(
  esbuildBin,
  [
    entry,
    "--bundle",
    "--format=esm",
    "--target=es2022",
    `--outfile=${path.join(outDir, "web-components.js")}`,
  ],
  { cwd: packageDir, stdio: "inherit" },
);

execFileSync(
  esbuildBin,
  [
    entry,
    "--bundle",
    "--format=iife",
    "--global-name=VikingUI",
    "--target=es2022",
    "--minify",
    `--outfile=${path.join(outDir, "viking-ui-elements.js")}`,
  ],
  { cwd: packageDir, stdio: "inherit" },
);

if (existsSync(widgetSource)) {
  copyFileSync(widgetSource, path.join(outDir, "widget.js"));
}

console.log(`Built Viking-UI elements in ${outDir}`);
