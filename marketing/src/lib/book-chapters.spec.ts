import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { loadBookChapters } from "./book-chapters.ts";

describe("loadBookChapters", (): void => {
  it("creates stable unique routes for repeated chapter headings", (): void => {
    const tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "deml-book-chapters-"),
    );
    const markdownPath = path.join(tempDir, "page.md");

    try {
      fs.writeFileSync(
        markdownPath,
        [
          "# DEML",
          "",
          "## Concept of Operations (CONOPS)",
          "",
          "Primary operating narrative.",
          "",
          "## Concept of Operations (CONOPS)",
          "",
          "Supporting operating reference.",
        ].join("\n"),
      );

      const slugs = loadBookChapters(markdownPath).map(
        (chapter) => chapter.slug,
      );

      assert.equal(new Set(slugs).size, slugs.length);
      assert.ok(slugs.includes("concept-of-operations-conops"));
      assert.ok(slugs.includes("concept-of-operations-conops-2"));
    } finally {
      fs.rmSync(tempDir, { force: true, recursive: true });
    }
  });
});
