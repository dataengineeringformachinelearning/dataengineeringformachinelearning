import { describe, it, expect } from "vitest";
import {
  clampChartWindow,
  fullChartWindow,
  panChartWindow,
  sliceChartData,
  zoomChartWindow,
} from "./chart-zoom";

describe("chart-zoom", () => {
  it("returns full window for positive counts", () => {
    expect(fullChartWindow(10)).toEqual({ start: 0, end: 10 });
    expect(fullChartWindow(0)).toEqual({ start: 0, end: 1 });
  });

  it("clamps window to valid bounds with minimum span", () => {
    expect(clampChartWindow({ start: -5, end: 20 }, 10, 3)).toEqual({
      start: 0,
      end: 10,
    });
    expect(clampChartWindow({ start: 0, end: 1 }, 10, 3)).toEqual({
      start: 0,
      end: 3,
    });
    expect(clampChartWindow({ start: 0, end: 0 }, 0, 3)).toEqual({
      start: 0,
      end: 0,
    });
  });

  it("zooms in on wheel up and out on wheel down", () => {
    const current = { start: 0, end: 20 };
    const zoomedIn = zoomChartWindow(current, 20, 0.5, -100, 3);
    const zoomedOut = zoomChartWindow(current, 20, 0.5, 100, 3);
    expect(zoomedIn.end - zoomedIn.start).toBeLessThan(20);
    expect(zoomedOut.end - zoomedOut.start).toBeGreaterThanOrEqual(20);
  });

  it("returns full window when count is at or below min span", () => {
    expect(zoomChartWindow({ start: 0, end: 3 }, 3, 0.5, -100, 3)).toEqual({
      start: 0,
      end: 3,
    });
  });

  it("pans window by delta points", () => {
    expect(panChartWindow({ start: 5, end: 15 }, 20, 3, 3)).toEqual({
      start: 2,
      end: 12,
    });
    expect(panChartWindow({ start: 0, end: 10 }, 20, -5, 3)).toEqual({
      start: 5,
      end: 15,
    });
  });

  it("slices data for the active window", () => {
    const values = ["a", "b", "c", "d", "e"];
    expect(sliceChartData(values, { start: 1, end: 4 })).toEqual([
      "b",
      "c",
      "d",
    ]);
  });
});
