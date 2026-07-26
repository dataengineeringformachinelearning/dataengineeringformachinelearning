import { describe, expect, it } from "vitest";
import { computeVirtualWindow, indicesForWindow } from "./virtual-window";

describe("indicesForWindow", () => {
  it("returns a contiguous index list", () => {
    expect(indicesForWindow(3, 7)).toEqual([3, 4, 5, 6]);
  });

  it("returns empty when end <= start", () => {
    expect(indicesForWindow(5, 5)).toEqual([]);
    expect(indicesForWindow(8, 2)).toEqual([]);
  });
});

describe("computeVirtualWindow", () => {
  it("returns an empty window for zero items", () => {
    expect(
      computeVirtualWindow({
        scrollTop: 0,
        viewportHeight: 400,
        itemCount: 0,
        itemHeight: 96,
      }),
    ).toEqual({
      start: 0,
      end: 0,
      offsetY: 0,
      totalHeight: 0,
      visibleCount: 0,
    });
  });

  it("windows a long list with overscan", () => {
    const win = computeVirtualWindow({
      scrollTop: 960,
      viewportHeight: 400,
      itemCount: 500,
      itemHeight: 96,
      overscan: 2,
    });
    // rawStart = 10; visible ≈ ceil(400/96)+1 = 6 → start 8, end 18
    expect(win.start).toBe(8);
    expect(win.end).toBe(18);
    expect(win.offsetY).toBe(8 * 96);
    expect(win.totalHeight).toBe(500 * 96);
    expect(win.visibleCount).toBe(10);
  });

  it("clamps to list bounds at the end", () => {
    const win = computeVirtualWindow({
      scrollTop: 48_000,
      viewportHeight: 400,
      itemCount: 100,
      itemHeight: 96,
      overscan: 4,
    });
    expect(win.start).toBeLessThan(win.end);
    expect(win.end).toBe(100);
    expect(win.offsetY + win.visibleCount * 96).toBeLessThanOrEqual(
      win.totalHeight,
    );
  });
});
