import { describe, expect, it } from "vitest";

import { safeHref, safeHttpBase } from "./safe-href";

describe("safeHref", () => {
  it("blocks XSS schemes and protocol-relative URLs", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,x")).toBeNull();
    expect(safeHref("//evil.example")).toBeNull();
  });

  it("allows https and relative paths", () => {
    expect(safeHref("https://deml.app/")).toBe("https://deml.app/");
    expect(safeHref("/docs")).toBe("/docs");
  });

  it("enforces host allowlists", () => {
    expect(
      safeHref("https://evil.example", { allowedHosts: ["deml.app"] }),
    ).toBeNull();
  });
});

describe("safeHttpBase", () => {
  it("normalizes trailing slashes", () => {
    expect(safeHttpBase("https://backend.deml.app/")).toBe(
      "https://backend.deml.app",
    );
  });
});
