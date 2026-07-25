import { describe, expect, it } from "vitest";
import { buildSuiteSearchItems } from "./suite-search-items";

const urls = {
  app: "https://deml.app",
  marketing: "https://dataengineeringformachinelearning.com",
  backend: "https://backend.deml.app",
};

describe("buildSuiteSearchItems", () => {
  it("includes community resources and omits retired documentation nav", () => {
    const items = buildSuiteSearchItems("marketing", urls);
    const titles = items.map((item) => item.title);

    expect(titles).toContain("Blue Notes");
    expect(titles).toContain("Book");
    expect(titles).not.toContain("Documentation");
    expect(titles).not.toContain("Viking-UI Storybook");
    expect(titles).toContain("DEML product showcase");
    expect(titles).toContain("DEML Swagger");
    expect(titles).toContain("DEML ReDoc");
    expect(titles).toContain("FORJD capabilities");
    expect(titles).not.toContain("FORJD Swagger");
    expect(items.find((item) => item.title === "DEML Swagger")?.href).toBe(
      "https://backend.deml.app/api/v1/docs",
    );
    expect(
      items.find((item) => item.title === "FORJD capabilities")?.href,
    ).toBe("https://backend.forjd.co/api/v1/capabilities");
  });

  it("hides auth-gated nav until authenticated", () => {
    const anon = buildSuiteSearchItems("app", urls, { authenticated: false });
    const auth = buildSuiteSearchItems("app", urls, { authenticated: true });
    const anonTitles = anon.map((item) => item.title);
    const authenticatedTitles = auth.map((item) => item.title);

    expect(anonTitles).not.toContain("Dashboard");
    expect(authenticatedTitles).toContain("Dashboard");
    expect(authenticatedTitles).toContain("Account");
  });

  it("includes Settings shortcut for app context", () => {
    const items = buildSuiteSearchItems("app", urls);
    expect(items.some((item) => item.title === "Settings")).toBe(true);
  });
});
