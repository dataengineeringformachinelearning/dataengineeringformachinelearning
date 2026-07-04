/** Fixed series palette — keep in sync with viking-tokens.json and THEME.md §8.4 */
export const VIKING_SERIES_PRESETS = [
  '#0d7377',
  '#922b3e',
  '#2a9d8f',
  '#c4a035',
  '#a83344',
  '#14a3a8',
  '#2a2a2a',
  '#666666',
] as const;

export const VIKING_SERIES_DEFAULT = VIKING_SERIES_PRESETS[0];

export type VikingSeriesPreset = (typeof VIKING_SERIES_PRESETS)[number];
