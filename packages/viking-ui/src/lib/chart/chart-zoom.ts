/** Visible index window for chart zoom/pan (inclusive start, exclusive end). */
export interface ChartZoomWindow {
  start: number;
  end: number;
}

export const fullChartWindow = (count: number): ChartZoomWindow => ({
  start: 0,
  end: Math.max(count, 1),
});

/** Clamp zoom window to valid bounds with a minimum visible span. */
export const clampChartWindow = (
  window: ChartZoomWindow,
  count: number,
  minSpan = 3,
): ChartZoomWindow => {
  if (count <= 0) {
    return { start: 0, end: 0 };
  }
  const span = Math.max(minSpan, Math.min(count, window.end - window.start));
  let start = Math.max(0, Math.min(window.start, count - span));
  let end = start + span;
  if (end > count) {
    end = count;
    start = Math.max(0, end - span);
  }
  return { start, end };
};

/** Wheel delta → narrower/wider window centered on cursor fraction (0–1). */
export const zoomChartWindow = (
  current: ChartZoomWindow,
  count: number,
  cursorFraction: number,
  deltaY: number,
  minSpan = 3,
): ChartZoomWindow => {
  if (count <= minSpan) {
    return fullChartWindow(count);
  }
  const span = current.end - current.start;
  const factor = deltaY < 0 ? 0.85 : 1.15;
  const nextSpan = Math.max(
    minSpan,
    Math.min(count, Math.round(span * factor)),
  );
  const anchor = current.start + span * cursorFraction;
  const raw: ChartZoomWindow = {
    start: Math.round(anchor - nextSpan * cursorFraction),
    end: Math.round(anchor - nextSpan * cursorFraction) + nextSpan,
  };
  return clampChartWindow(raw, count, minSpan);
};

/** Drag delta in data points → pan window. */
export const panChartWindow = (
  current: ChartZoomWindow,
  count: number,
  deltaPoints: number,
  minSpan = 3,
): ChartZoomWindow =>
  clampChartWindow(
    { start: current.start - deltaPoints, end: current.end - deltaPoints },
    count,
    minSpan,
  );

/** Slice series rows and category labels for the active window. */
export const sliceChartData = <T>(values: T[], window: ChartZoomWindow): T[] =>
  values.slice(window.start, window.end);
