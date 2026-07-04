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
    '<path d="M12 10.189V14"/><path d="M12 2v3"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-8.188-3.639a2 2 0 0 0-1.624 0L3 14a11.6 11.6 0 0 0 2.81 7.76"/><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M3 21h18"/>',
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
    '<path d="M7 5h10a2 2 0 0 1 2 2v3.5L20.8 14.2l-7.8-3.5a1.8 1.8 0 0 0-1.4 0L3.2 14.2a10.5 10.5 0 0 0 2.6 7.2L5.2 13V7a2 2 0 0 0-2-2z"/><rect x="10.85" y="2" width="2.3" height="12" rx="0.4"/>',
  'drakkar-compact':
    '<path d="M3 3h18a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7.5 12.5 12 9.8l4.5 2.7v2.2c0 .8-.5 1.4-1.2 1.7L12 17.8l-3.3-1.6c-.7-.3-1.2-.9-1.2-1.7v-2.2z"/><rect x="11" y="6" width="2" height="5.5" rx="0.35"/>',
  'drakkar-lockup':
    '<path d="M7 5h10a2 2 0 0 1 2 2v3.5L20.8 14.2l-7.8-3.5a1.8 1.8 0 0 0-1.4 0L3.2 14.2a10.5 10.5 0 0 0 2.6 7.2L5.2 13V7a2 2 0 0 0-2-2z"/><rect x="10.85" y="2" width="2.3" height="12" rx="0.4"/><rect x="3" y="20" width="18" height="2" rx="1"/>',
};

export type VikingBrandIconName = keyof typeof VIKING_BRAND_ICON_PATHS;

export type VikingDrakkarIconName = keyof typeof VIKING_DRAKKAR_ICON_PATHS;

export const VIKING_BRAND_ICON_NAMES_LIST = Object.keys(
  VIKING_BRAND_ICON_PATHS,
) as VikingBrandIconName[];

/** Platform integration marks — recognizable brand geometry (24×24). */
export const VIKING_INTEGRATION_ICON_PATHS = {
  /** Kubernetes ship-wheel topology. */
  kubernetes:
    '<path d="M12 3.2 13.4 8h4.9l-4 2.9 1.5 4.9L12 13.4 8.2 15.8l1.5-4.9-4-2.9h4.9L12 3.2z"/><circle cx="12" cy="12" r="2.1"/>',
  /** TensorFlow node graph (three-link tensor). */
  tensorflow:
    '<rect x="3.5" y="3.5" width="7" height="7" rx="1.2"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.2"/><rect x="8.5" y="13.5" width="7" height="7" rx="1.2"/><path d="M7 7h4v2H9v4H7V7zm10 0h-2v6h-2v2h4V7z"/>',
  /** PyTorch flame mark. */
  pytorch:
    '<path d="M12 4.5c-1.8 2.6-3.5 4.4-3.5 6.8a3.5 3.5 0 0 0 7 0c0-2.4-1.7-4.2-3.5-6.8z"/><ellipse cx="12" cy="16.5" rx="2.2" ry="3.2"/><circle cx="10.8" cy="10.2" r="1"/>',
  /** Apache Spark star burst. */
  'apache-spark':
    '<path d="M12 2.5v3.8M12 17.7v3.8M2.5 12h3.8M17.7 12h3.8M5.4 5.4l2.7 2.7M15.9 15.9l2.7 2.7M18.6 5.4l-2.7 2.7M8.1 15.9l-2.7 2.7"/><polygon points="12,8 15.5,14 8.5,14"/>',
  /** Databricks brick stack. */
  databricks:
    '<rect x="4" y="5" width="16" height="3.5" rx="0.8"/><rect x="4" y="10.25" width="16" height="3.5" rx="0.8"/><rect x="4" y="15.5" width="16" height="3.5" rx="0.8"/><path d="M8 6.75h8M8 12h8M8 17.25h8"/>',
  /** AWS Redshift warehouse cylinder. */
  'aws-redshift':
    '<ellipse cx="12" cy="7" rx="7.5" ry="2.8"/><path d="M4.5 7v9.5c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8V7"/><ellipse cx="12" cy="12" rx="7.5" ry="2.8"/><path d="M15.5 11.5 12 14l-3.5-2.5 1-1.3L12 11.4l2.5-1.7 1 1.8z"/>',
} as const;

export type VikingIntegrationIconName = keyof typeof VIKING_INTEGRATION_ICON_PATHS;

export const VIKING_INTEGRATION_ICON_NAMES_LIST = Object.keys(
  VIKING_INTEGRATION_ICON_PATHS,
) as VikingIntegrationIconName[];

export const VIKING_DRAKKAR_ICON_NAMES_LIST = Object.keys(
  VIKING_DRAKKAR_ICON_PATHS,
) as VikingDrakkarIconName[];
