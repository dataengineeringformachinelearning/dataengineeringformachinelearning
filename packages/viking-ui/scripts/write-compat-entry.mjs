import { writeFileSync } from "node:fs";
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

console.log(
  "Wrote Viking-UI compatibility entries at dist/index.js and dist/index.d.ts",
);
