import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const rootDir = path.join(packageDir, "..", "..");
const outDir = path.join(packageDir, "dist");
const entry = path.join(packageDir, "src", "web", "index.ts");
const localEsbuild = path.join(packageDir, "node_modules", ".bin", "esbuild");
const frontendEsbuild = path.join(
  rootDir,
  "frontend",
  "node_modules",
  ".bin",
  "esbuild",
);
const localTsc = path.join(packageDir, "node_modules", ".bin", "tsc");
const frontendTsc = path.join(
  rootDir,
  "frontend",
  "node_modules",
  ".bin",
  "tsc",
);
const esbuildBin = existsSync(localEsbuild)
  ? localEsbuild
  : existsSync(frontendEsbuild)
    ? frontendEsbuild
    : "esbuild";
const tscBin = existsSync(localTsc)
  ? localTsc
  : existsSync(frontendTsc)
    ? frontendTsc
    : "tsc";

mkdirSync(outDir, { recursive: true });

execFileSync(
  esbuildBin,
  [
    entry,
    "--bundle",
    "--format=esm",
    "--target=es2022",
    `--outfile=${path.join(outDir, "index.js")}`,
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

execFileSync(tscBin, ["--project", "tsconfig.json"], {
  cwd: packageDir,
  stdio: "inherit",
});

console.log(`Built Viking-UI elements in ${outDir}`);
