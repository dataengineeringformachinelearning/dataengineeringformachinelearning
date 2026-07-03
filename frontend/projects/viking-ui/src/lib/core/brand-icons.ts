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
    '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 17V13M11 17V8M15 17V11"/><path d="M2 20h20"/>',
} as const;

/** Drakkar — Viking-UI / site shell brand marks (Lucide ship, build-time inlined). */
export const VIKING_DRAKKAR_ICON_PATHS = {
  /** Primary Drakkar longship mark (outline). */
  drakkar:
    '<path d="M12 10.189V14"/><path d="M12 2v3"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.639a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76"/><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
  /** Compact tile for favicons and dense navbar chrome. */
  'drakkar-compact':
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 10.189V14"/><path d="M12 2v3"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.639a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76"/><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
  /** Lockup mark with baseline accent bar. */
  'drakkar-lockup':
    '<path d="M12 10.189V14"/><path d="M12 2v3"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.639a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76"/><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 22h20"/>',
} as const;

/** Filled-path overrides for DEML brand marks. */
export const VIKING_BRAND_ICON_FILLED_PATHS: Partial<
  Record<keyof typeof VIKING_BRAND_ICON_PATHS, string>
> = {
  deml: '<path d="M5 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4zm2 11h2.5V10H7v5zm4.5-5h2.5v10h-2.5V10zm4.5-3h2.5v13h-2.5V7z"/>',
  'deml-compact':
    '<path d="M6 5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5zm2 9h1.5V11H8v3zm2.5-4h1.5v7h-1.5V10zm2.5-2h1.5v9h-1.5V8z"/>',
  'deml-lockup':
    '<path d="M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5zm2 10h2V11H6v4zm3.5-4h2v8h-2V11zm3-2h2v10h-2V9z"/><rect x="2" y="19" width="20" height="2" rx="1"/>',
};

/** Filled-path overrides for Drakkar brand marks. */
export const VIKING_DRAKKAR_ICON_FILLED_PATHS: Partial<
  Record<keyof typeof VIKING_DRAKKAR_ICON_PATHS, string>
> = {
  drakkar:
    '<path d="M7 5h10a2 2 0 0 1 2 2v6H5V7a2 2 0 0 1 2-2z"/><path d="M12 2v3"/><path d="M4.5 14.2 12 10.8l7.5 3.4c.9 2.1.6 4.5-.6 6.4H5.1c-1.2-1.9-1.5-4.3-.6-6.4z"/><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
  'drakkar-compact':
    '<path d="M5 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4z"/><path d="M8 7h8a1 1 0 0 1 1 1v4H7V8a1 1 0 0 1 1-1z"/><path d="M11 5.5V8"/><path d="M6.5 12.5 12 10l5.5 2.5c.5 1.2.4 2.5-.3 3.5H6.8c-.7-1-.8-2.3-.3-3.5z"/><path d="M5 16.5c.4.3.8.5 1.5.5 1.5 0 1.5-1 3-1 .6 0 1 .2 1.5.5"/>',
  'drakkar-lockup':
    '<path d="M7 5h10a2 2 0 0 1 2 2v6H5V7a2 2 0 0 1 2-2z"/><path d="M12 2v3"/><path d="M4.5 14.2 12 10.8l7.5 3.4c.9 2.1.6 4.5-.6 6.4H5.1c-1.2-1.9-1.5-4.3-.6-6.4z"/><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><rect x="2" y="20" width="20" height="2" rx="1"/>',
};

export type VikingBrandIconName = keyof typeof VIKING_BRAND_ICON_PATHS;

export type VikingDrakkarIconName = keyof typeof VIKING_DRAKKAR_ICON_PATHS;

export const VIKING_BRAND_ICON_NAMES_LIST = Object.keys(
  VIKING_BRAND_ICON_PATHS,
) as VikingBrandIconName[];

export const VIKING_DRAKKAR_ICON_NAMES_LIST = Object.keys(
  VIKING_DRAKKAR_ICON_PATHS,
) as VikingDrakkarIconName[];
