/** Fixed series palette — keep in sync with viking-tokens.json and THEME.md §8.4 */
export const VIKING_SERIES_PRESETS = [
  'var(--viking-teal-600)',
  'var(--viking-crimson-600)',
  'var(--viking-green-500)',
  'var(--viking-gold-500)',
  'var(--viking-crimson-500)',
  'var(--viking-teal-400)',
  'var(--viking-charcoal-700)',
  'var(--viking-metallic-500)',
] as const;

export const VIKING_SERIES_DEFAULT = VIKING_SERIES_PRESETS[0];

export type VikingSeriesPreset = (typeof VIKING_SERIES_PRESETS)[number];
