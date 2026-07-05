/**
 * Zero-dependency inline SVG icon registry (24×24 stroke icons).
 * Lucide paths are synced at build time; DEML brand marks are custom artwork.
 */
import { LUCIDE_ICON_PATHS } from './lucide-paths.generated';
import {
  VIKING_BRAND_ICON_FILLED_PATHS,
  VIKING_BRAND_ICON_PATHS,
  VIKING_BRAND_ICON_NAMES_LIST,
  VIKING_DRAKKAR_ICON_FILLED_PATHS,
  VIKING_DRAKKAR_ICON_PATHS,
  VIKING_DRAKKAR_ICON_NAMES_LIST,
} from './brand-icons';
import {
  VIKING_INTEGRATION_ICON_PATHS,
  VIKING_INTEGRATION_ICON_NAMES_LIST,
} from './integration-brand-icons';

export { VIKING_DRAKKAR_ICON_NAMES_LIST, VIKING_BRAND_ICON_NAMES_LIST } from './brand-icons';
export {
  VIKING_INTEGRATION_ICON_NAMES_LIST,
  type VikingIntegrationIconName,
} from './integration-brand-icons';

export type VikingIconName = keyof typeof VIKING_ICON_PATHS;

export type VikingIconSizePreset = 'sm' | 'md' | 'lg';

export type VikingIconVariant = 'outline' | 'filled';

/** Semantic color tokens resolved to CSS custom properties. */
export type VikingIconColorToken =
  | 'inherit'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted'
  | 'text';

/** Pixel sizes for sm / md / lg presets. */
export const VIKING_ICON_SIZE_PRESETS: Record<VikingIconSizePreset, number> = {
  sm: 16,
  md: 20,
  lg: 24,
} as const;

/** Custom icons not covered by Lucide (hub topology, ML model tile, OAuth stubs). */
const VIKING_CUSTOM_ICON_PATHS = {
  hub: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
  model: '<rect x="4" y="8" width="16" height="10" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',
  google:
    '<path d="M12 11.2v2.4h6.6c-.3 1.5-1.8 4.4-6.6 4.4-4 0-7.2-3.3-7.2-7.3S8 3.4 12 3.4c2.3 0 3.9 1 4.8 1.8l3.2-3.1C17.5.8 14.9 0 12 0 5.4 0 0 5.4 0 12s5.4 12 12 12c6.9 0 11.5-4.8 11.5-11.6 0-.8-.1-1.4-.2-1.9H12z"/>',
  apple:
    '<path d="M16.365 12.14c.02 2.53 2.21 3.38 2.23 3.39-.02.07-.35 1.21-1.16 2.4-.7 1.02-1.43 2.03-2.58 2.05-1.13.02-1.49-.67-2.78-.67-1.29 0-1.69.65-2.75.69-1.11.04-1.95-1.12-2.66-2.13-1.44-2.08-2.54-5.87-1.07-8.43.73-1.27 2.04-2.08 3.46-2.1 1.08-.02 2.1.72 2.78.72.67 0 2.14-.89 3.61-.76.61.03 2.33.25 3.44 1.88-.09.06-2.05 1.2-2.03 3.55M13.75 3.64c.59-.71 1-1.7.89-2.68-.86.03-1.9.57-2.52 1.28-.55.63-1.03 1.65-.9 2.62.95.07 1.92-.49 2.53-1.22"/>',
} as const;

export const VIKING_ICON_PATHS = {
  ...LUCIDE_ICON_PATHS,
  ...VIKING_BRAND_ICON_PATHS,
  ...VIKING_DRAKKAR_ICON_PATHS,
  ...VIKING_INTEGRATION_ICON_PATHS,
  ...VIKING_CUSTOM_ICON_PATHS,
} as const;

/** Filled-path overrides used when variant="filled" (brand marks, solid shapes). */
export const VIKING_ICON_FILLED_PATHS: Partial<Record<VikingIconName, string>> = {
  ...VIKING_BRAND_ICON_FILLED_PATHS,
  ...VIKING_DRAKKAR_ICON_FILLED_PATHS,
};

/** Legacy Material Icons ligature names → Viking icon registry keys. */
export const MATERIAL_ICON_ALIASES: Record<string, VikingIconName> = {
  analytics: 'deml',
  security: 'shield',
  link: 'link',
  visibility: 'eye',
  shield: 'shield',
  trending_up: 'trending-up',
  lock: 'lock',
  fingerprint: 'fingerprint',
  gpp_maybe: 'shield',
  verified_user: 'user-shield',
  bolt: 'bolt',
  cloud: 'cloud',
  lan: 'network',
  hub: 'hub',
  speed: 'speed',
  rocket_launch: 'rocket',
  insights: 'insights',
  check: 'check',
  description: 'file',
  vpn_key: 'key',
  policy: 'policy',
  bug_report: 'bug',
  search: 'search',
  chevron_left: 'chevron-left',
  chevron_right: 'chevron-right',
  verified: 'check-circle',
  warning: 'alert-triangle',
  close: 'x',
  account_balance: 'building',
  send: 'send',
  check_circle: 'check-circle',
  play_circle: 'play',
  input: 'terminal',
  model_training: 'model',
  auto_awesome: 'sparkle',
  error_outline: 'alert-circle',
  home: 'home',
  cookie: 'cookie',
  search_off: 'search-off',
  person_add: 'user',
  storage: 'aws-redshift',
  data_object: 'aws-redshift',
  memory: 'tensorflow',
  psychology: 'pytorch',
  dns: 'server',
  login: 'log-in',
};

/** Icons always rendered with fill (play triangle, dot grids). */
export const VIKING_FILLED_ICON_NAMES = [
  'play',
  'dots-horizontal',
  'dots-vertical',
  'grip-vertical',
] as const satisfies readonly VikingIconName[];

/** OAuth / vendor marks rendered with official brand artwork in viking-icon. */
export const VIKING_BRAND_ICON_NAMES = [
  'google',
  'apple',
  ...VIKING_BRAND_ICON_NAMES_LIST,
] as const satisfies readonly VikingIconName[];

const VIKING_ICON_COLOR_TOKENS: Record<Exclude<VikingIconColorToken, 'inherit'>, string> = {
  accent: 'var(--viking-accent)',
  success: 'var(--viking-success)',
  warning: 'var(--viking-warning)',
  danger: 'var(--viking-danger)',
  info: 'var(--viking-info)',
  muted: 'var(--viking-text-muted)',
  text: 'var(--viking-text)',
};

export const vikingIconViewBox = (_name: VikingIconName): string => '0 0 24 24';

/** Resolve pixel size from preset or explicit value. */
export const resolveVikingIconSize = (
  size: number | undefined,
  preset: VikingIconSizePreset | null | undefined,
): number => {
  if (preset) {
    return VIKING_ICON_SIZE_PRESETS[preset];
  }
  return size ?? VIKING_ICON_SIZE_PRESETS.lg;
};

/** Resolve semantic color token or raw CSS value for icon tinting. */
export const resolveVikingIconColor = (
  color: VikingIconColorToken | string | undefined,
): string | undefined => {
  if (!color || color === 'inherit') {
    return undefined;
  }
  if (color in VIKING_ICON_COLOR_TOKENS) {
    return VIKING_ICON_COLOR_TOKENS[color as Exclude<VikingIconColorToken, 'inherit'>];
  }
  return color;
};

const VIKING_ICON_PATH_KEYS = new Set(Object.keys(VIKING_ICON_PATHS));

/** Resolve a Viking or legacy Material icon name to a registry key. */
export const resolveVikingIcon = (name: string): VikingIconName => {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, '_');
  if (VIKING_ICON_PATH_KEYS.has(normalized)) {
    return normalized as VikingIconName;
  }
  const alias = MATERIAL_ICON_ALIASES[normalized];
  if (alias) {
    return alias;
  }
  return 'info';
};

export const VIKING_ICON_NAMES = Object.keys(VIKING_ICON_PATHS) as VikingIconName[];

/** Lucide-sourced icon names (for docs and showcase grouping). */
export const VIKING_LUCIDE_ICON_NAMES = Object.keys(
  LUCIDE_ICON_PATHS,
) as (keyof typeof LUCIDE_ICON_PATHS)[];
