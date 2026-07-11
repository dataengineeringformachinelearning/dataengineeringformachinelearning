import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const storybookIndex = path.resolve("storybook-static/index.html");

const normalizeStorybookViewport = async () => {
  try {
    const html = await readFile(storybookIndex, "utf8");
    const normalizedHtml = html.replace(/,\s*maximum-scale=1/g, "");

    if (normalizedHtml === html) {
      throw new Error("Storybook viewport metadata was not found");
    }

    await writeFile(storybookIndex, normalizedHtml, "utf8");
  } catch (error) {
    console.error("Failed to normalize Storybook viewport metadata", error);
    process.exitCode = 1;
  }
};

await normalizeStorybookViewport();
