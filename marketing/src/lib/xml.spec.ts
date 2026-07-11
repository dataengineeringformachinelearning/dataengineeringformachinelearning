import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { escapeXml } from "./xml.ts";

describe("escapeXml", () => {
  it("encodes every XML-sensitive character", () => {
    assert.equal(
      escapeXml(`<release title="Blue's & secure">`),
      "&lt;release title=&quot;Blue&apos;s &amp; secure&quot;&gt;",
    );
  });

  it("leaves ordinary release copy unchanged", () => {
    assert.equal(escapeXml("DEML Blue Notes 2.0"), "DEML Blue Notes 2.0");
  });
});
