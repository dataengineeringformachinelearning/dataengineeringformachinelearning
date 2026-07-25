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
    expect(titles).toContain("Viking-UI Storybook");
    expect(titles).toContain("DEML product showcase");
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

  it("includes Storybook home for docs context", () => {
    const items = buildSuiteSearchItems("docs", urls, {
      docsOrigin: "https://ui.deml.app",
    });
    const titles = items.map((item) => item.title);

    expect(titles).toContain("Storybook home");
    expect(titles).toContain("Whitepaper");
    expect(items.find((item) => item.title === "Storybook home")?.href).toBe(
      "https://ui.deml.app/",
    );
    expect(
      items.find((item) => item.title === "DEML product showcase")?.href,
    ).toBe("https://deml.app/#docs");
    expect(items.find((item) => item.title === "Whitepaper")?.href).toBe(
      "https://dataengineeringformachinelearning.com/whitepaper",
    );
  });

  it("includes Settings shortcut for app context", () => {
    const items = buildSuiteSearchItems("app", urls);
    expect(items.some((item) => item.title === "Settings")).toBe(true);
  });
});
