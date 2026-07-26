import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_RECENT_STORAGE_KEY,
  clearRecentSearches,
  pushRecentSearch,
  readRecentSearches,
  recentSearchesAsItems,
} from "./recent-searches";

describe("recentSearches", () => {
  beforeEach(() => {
    clearRecentSearches(DEFAULT_RECENT_STORAGE_KEY);
  });

  afterEach(() => {
    clearRecentSearches(DEFAULT_RECENT_STORAGE_KEY);
  });

  it("stores newest first and dedupes", () => {
    pushRecentSearch({ query: "components" });
    pushRecentSearch({ query: "theming" });
    pushRecentSearch({
      query: "components",
      title: "Components",
      href: "/components",
    });
    const recent = readRecentSearches();
    expect(recent.map((row) => row.query)).toEqual(["components", "theming"]);
    expect(recent[0]?.href).toBe("/components");
  });

  it("maps query-only rows to re-run hrefs", () => {
    pushRecentSearch({ query: "sealed ingest" });
    const items = recentSearchesAsItems(readRecentSearches());
    expect(items[0]?.group).toBe("Recent");
    expect(items[0]?.href.startsWith("#viking-recent:")).toBe(true);
  });
});
