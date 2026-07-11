import { access, cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.resolve(scriptDir, "..");
const sourceDir = path.resolve(
  docsDir,
  "../packages/viking-ui/storybook-static",
);
const targetDir = path.resolve(docsDir, "dist/storybook");

const embedStorybook = async () => {
  try {
    await access(path.join(sourceDir, "index.html"));
    await mkdir(path.dirname(targetDir), { recursive: true });
    await rm(targetDir, { recursive: true, force: true });
    await cp(sourceDir, targetDir, { recursive: true });
  } catch (error) {
    console.error(
      "Storybook must be built before it can be embedded in the Viking-UI docs.",
      error,
    );
    process.exitCode = 1;
  }
};

await embedStorybook();
