/** Fixed series palette — Role B; keep in sync with suite-tokens.css --suite-series-* */
export const VIKING_SERIES_PRESETS = [
  "var(--suite-series-1)",
  "var(--suite-series-2)",
  "var(--suite-series-3)",
  "var(--suite-series-4)",
  "var(--suite-series-5)",
  "var(--suite-series-6)",
  "var(--suite-series-7)",
  "var(--suite-series-8)",
] as const;

export const VIKING_SERIES_DEFAULT = VIKING_SERIES_PRESETS[0];

export type VikingSeriesPreset = (typeof VIKING_SERIES_PRESETS)[number];
