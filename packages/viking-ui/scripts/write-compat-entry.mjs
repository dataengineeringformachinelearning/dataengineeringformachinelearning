import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

writeFileSync(
  path.join(packageDir, "dist", "index.js"),
  'export * from "./fesm2022/dataengineeringformachinelearning-viking-ui.mjs";\n',
);

writeFileSync(
  path.join(packageDir, "dist", "index.d.ts"),
  'export * from "./types/dataengineeringformachinelearning-viking-ui";\n',
);

const distPackagePath = path.join(packageDir, "dist", "package.json");
const distPackage = JSON.parse(readFileSync(distPackagePath, "utf8"));
const normalizeDistPath = (value) =>
  typeof value === "string" ? value.replace(/^\.\/dist\//, "./") : value;
const normalizeExports = (value) => {
  if (typeof value === "string") {
    return normalizeDistPath(value);
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, exportValue]) => [
        key,
        normalizeExports(exportValue),
      ]),
    );
  }

  return value;
};

distPackage.main = normalizeDistPath(distPackage.main);
distPackage.module = normalizeDistPath(distPackage.module);
distPackage.types = normalizeDistPath(distPackage.types);
distPackage.style = normalizeDistPath(distPackage.style);
distPackage.browser = normalizeDistPath(distPackage.browser);
distPackage.exports = normalizeExports(distPackage.exports);
distPackage.files = [
  "fesm2022",
  "types",
  "src/tokens",
  "fonts",
  "*.css",
  "*.js",
  "*.d.ts",
  "*.json",
  "README.md",
  "LICENSE",
];
distPackage.sideEffects = Array.isArray(distPackage.sideEffects)
  ? distPackage.sideEffects.map(normalizeDistPath)
  : distPackage.sideEffects;

writeFileSync(distPackagePath, `${JSON.stringify(distPackage, null, 2)}\n`);

console.log(
  "Wrote Viking-UI compatibility entries and normalized dist/package.json",
);
