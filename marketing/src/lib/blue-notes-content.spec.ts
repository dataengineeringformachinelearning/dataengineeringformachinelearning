import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const blueNotesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../content/blue-notes",
);

const markdownBody = (source: string, filename: string): string => {
  const match = source.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
  assert.ok(match, `${filename} must contain valid frontmatter`);
  return match[1].trim();
};

describe("published Blue Notes", (): void => {
  it("provide enough section structure for the article outline", (): void => {
    const filenames = readdirSync(blueNotesDir).filter((filename) =>
      filename.endsWith(".md"),
    );

    for (const filename of filenames) {
      const source = readFileSync(path.join(blueNotesDir, filename), "utf8");
      if (/^draft:\s*true\s*$/m.test(source)) continue;

      const headings =
        markdownBody(source, filename).match(/^##\s+\S.*$/gm) ?? [];
      assert.ok(
        headings.length >= 2,
        `${filename} must contain at least two level-two sections`,
      );
    }
  });
});
