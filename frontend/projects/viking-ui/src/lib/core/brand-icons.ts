/**
 * DEML branded icon paths — optimized SVG geometry (not sourced from Lucide).
 * Use via viking-icon name="deml" | "deml-compact" | "deml-lockup".
 */
export const VIKING_BRAND_ICON_PATHS = {
  /** Primary bar-chart mark in rounded frame (outline). */
  deml: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 17V13M12 17V8M16 17V11"/>',
  /** Compact monogram for favicons and dense Drakkar shell. */
  'deml-compact':
    '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 16V12M12 16V9M15 16V13"/>',
  /** Lockup mark with baseline accent bar. */
  'deml-lockup':
    '<rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 17V13M12 17V8M16 17V11"/><path d="M3 20h18"/>',
} as const;

/** Drakkar — Viking-UI / site shell brand marks (custom longship geometry). */
export const VIKING_DRAKKAR_ICON_PATHS = {
  /** Primary Drakkar longship mark (outline). */
  drakkar:
    '<path d="M12 4v7"/><path d="M8.5 10.5h7"/><path d="M5.5 13.5h13q-6.5 5.5-13 0"/><path d="M4 20h16"/>',
  /** Compact tile for favicons and dense navbar chrome. */
  'drakkar-compact':
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 7v4.5"/><path d="M9.5 10.5h5"/><path d="M7 13h10q-5 4-10 0"/>',
  /** Lockup mark with baseline accent bar. */
  'drakkar-lockup':
    '<path d="M12 4v7"/><path d="M8.5 10.5h7"/><path d="M5.5 13.5h13q-6.5 5.5-13 0"/><path d="M4 20h16"/><path d="M3 21h18"/>',
} as const;

/** Filled-path overrides for DEML brand marks. */
export const VIKING_BRAND_ICON_FILLED_PATHS: Partial<
  Record<keyof typeof VIKING_BRAND_ICON_PATHS, string>
> = {
  deml: '<path d="M5 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4zM8 13h2.5v4H8v-4zM12 8h2.5v9H12V8zM16 11h2.5v6H16v-6z"/>',
  'deml-compact':
    '<path d="M6 5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5zM9 12h1.5v4H9v-4zM12 9h1.5v7H12V9zM15 11h1.5v5H15v-5z"/>',
  'deml-lockup':
    '<path d="M4 4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4zM8 13h2.5v4H8v-4zM12 8h2.5v9H12V8zM16 11h2.5v6H16v-6z"/><rect x="3" y="19" width="18" height="2" rx="1"/>',
};

/** Filled-path overrides for Drakkar brand marks. */
export const VIKING_DRAKKAR_ICON_FILLED_PATHS: Partial<
  Record<keyof typeof VIKING_DRAKKAR_ICON_PATHS, string>
> = {
  drakkar:
    '<path d="M6 13.5h12L16.8 18.3H7.2Z"/><rect x="11.35" y="4" width="1.3" height="9.5" rx="0.25"/><rect x="8.5" y="10" width="7" height="1" rx="0.2"/>',
  'drakkar-compact':
    '<path d="M6 5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5z"/><path d="M7.5 13h9l-1 3.5H8.5Z"/><rect x="11.4" y="7" width="1.2" height="6" rx="0.2"/><rect x="9.25" y="11" width="5.5" height="0.9" rx="0.15"/>',
  'drakkar-lockup':
    '<path d="M6 13.5h12L16.8 18.3H7.2Z"/><rect x="11.35" y="4" width="1.3" height="9.5" rx="0.25"/><rect x="8.5" y="10" width="7" height="1" rx="0.2"/><rect x="3" y="20" width="18" height="1.5" rx="0.5"/>',
};

export type VikingBrandIconName = keyof typeof VIKING_BRAND_ICON_PATHS;

export type VikingDrakkarIconName = keyof typeof VIKING_DRAKKAR_ICON_PATHS;

export const VIKING_BRAND_ICON_NAMES_LIST = Object.keys(
  VIKING_BRAND_ICON_PATHS,
) as VikingBrandIconName[];

export const VIKING_DRAKKAR_ICON_NAMES_LIST = Object.keys(
  VIKING_DRAKKAR_ICON_PATHS,
) as VikingDrakkarIconName[];
