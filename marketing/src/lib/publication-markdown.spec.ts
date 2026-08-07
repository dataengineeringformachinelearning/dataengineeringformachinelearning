import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  renderPublicationMarkdown,
  rewritePublicationHref,
} from "./publication-markdown.ts";

describe("publication Markdown", (): void => {
  it("adds stable heading ids and resolves cross-chapter fragments", (): void => {
    const html = renderPublicationMarkdown(
      "## Current section\n\n[CONOPS](#concept-of-operations-conops)",
      {
        headingTargets: new Map([
          [
            "concept-of-operations-conops",
            "/book/concept-of-operations-conops/#concept-of-operations-conops",
          ],
        ]),
      },
    );

    assert.match(html, /<h2 id="current-section">Current section<\/h2>/);
    assert.match(
      html,
      /href="\/book\/concept-of-operations-conops\/#concept-of-operations-conops"/,
    );
  });

  it("maps synced repository references to their public owners", (): void => {
    assert.equal(
      rewritePublicationHref("docs/FORJD_INTEGRATION.md"),
      "https://github.com/dataengineeringformachinelearning/deml/blob/main/docs/FORJD_INTEGRATION.md",
    );
    assert.equal(
      rewritePublicationHref("apache-spark.md"),
      "https://github.com/dataengineeringformachinelearning/deml/tree/main/docs",
    );
    assert.equal(
      rewritePublicationHref("WHITEPAPER.md#2-concept-of-operations-conops"),
      "/whitepaper#section-2-concept-of-operations-conops",
    );
  });

  it("removes the synced document title when the page already owns its H1", (): void => {
    const html = renderPublicationMarkdown(
      "# Synced title\n\nAbstract.\n\n## First section",
      { stripLeadingH1: true },
    );

    assert.doesNotMatch(html, /<h1/);
    assert.doesNotMatch(html, /Synced title/);
    assert.match(html, /<h2 id="first-section">First section<\/h2>/);
  });
});
