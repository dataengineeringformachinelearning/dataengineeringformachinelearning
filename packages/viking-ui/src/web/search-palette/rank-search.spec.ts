import { describe, expect, it } from "vitest";
import { rankSearchItems, scoreSearchItem } from "./rank-search";
import type { VikingSearchPaletteItem } from "../core/types";

const items: VikingSearchPaletteItem[] = [
  {
    title: "Components",
    href: "/components",
    group: "Docs",
    keywords: ["primitives", "button"],
  },
  {
    title: "Theming",
    href: "/theming",
    group: "Docs",
    snippet: "suite tokens",
  },
  {
    title: "Dashboard",
    href: "/dashboard",
    group: "App",
  },
];

describe("rankSearchItems", () => {
  it("prefers exact title matches", () => {
    const ranked = rankSearchItems(items, "theming");
    expect(ranked[0]?.title).toBe("Theming");
    expect(scoreSearchItem(items[1]!, "theming")).toBe(100);
  });

  it("matches keywords", () => {
    expect(
      rankSearchItems(items, "primitives").map((row) => row.title),
    ).toEqual(["Components"]);
  });

  it("returns curated list for empty query", () => {
    expect(rankSearchItems(items, "").length).toBe(3);
  });
});
