import {
  resolveVikingIcon,
  VIKING_FILLED_ICON_NAMES,
  VIKING_ICON_FILLED_PATHS,
  VIKING_ICON_PATHS,
  type VikingIconName,
} from "../../lib/core/icons";

const FILLED_ICON_SET = new Set<string>(VIKING_FILLED_ICON_NAMES);

/**
 * Renders a zero-dependency inline SVG icon for Web Components.
 * Uses the same registry as `viking-icon` in Angular.
 */
export const renderInlineIcon = (
  name: string,
  size = 16,
  className = "viking-wc-icon",
): string => {
  const resolved = resolveVikingIcon(name);
  const filled = FILLED_ICON_SET.has(resolved);
  const paths = filled
    ? (VIKING_ICON_FILLED_PATHS[resolved as VikingIconName] ??
      VIKING_ICON_PATHS[resolved])
    : VIKING_ICON_PATHS[resolved];

  if (filled) {
    return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd" aria-hidden="true">${paths}</svg>`;
  }

  return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
};

/** Default tone → icon mapping shared by callout and badge surfaces. */
export const TONE_ICON_NAMES: Record<string, string> = {
  accent: "info",
  secondary: "info",
  success: "check-circle",
  warning: "alert-triangle",
  danger: "alert-circle",
  info: "info",
  muted: "info",
  subtle: "info",
};
