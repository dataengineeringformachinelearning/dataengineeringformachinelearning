/**
 * Attribute parsers for Viking-UI Web Components.
 * Pure helpers — no framework runtime, no DOM dependency.
 */

/** Boolean attribute: presence-true unless explicit "false" / "0" / "off" / "no". */
export const parseBoolean = (value: string | null | undefined): boolean => {
  if (value == null) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "" || normalized === "true" || normalized === "1") {
    return true;
  }
  if (
    normalized === "false" ||
    normalized === "0" ||
    normalized === "off" ||
    normalized === "no"
  ) {
    return false;
  }
  return true;
};

/** Finite number from attribute string; falls back to `fallback` when invalid. */
export const parseNumber = (
  value: string | null | undefined,
  fallback = 0,
): number => {
  if (value == null || value.trim() === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** JSON attribute; returns `undefined` on empty or parse failure. */
export const parseJson = <T>(
  value: string | null | undefined,
): T | undefined => {
  if (value == null || value.trim() === "") {
    return undefined;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
};

/**
 * Constrained string enum from attribute.
 * Returns `fallback` (first option when omitted) if value is not in `options`.
 */
export const parseSelect = <T extends string>(
  value: string | null | undefined,
  options: readonly T[],
  fallback?: T,
): T => {
  const defaultValue = fallback ?? options[0];
  if (defaultValue === undefined) {
    throw new Error("parseSelect requires a non-empty options list");
  }
  if (value == null) {
    return defaultValue;
  }
  return (options as readonly string[]).includes(value)
    ? (value as T)
    : defaultValue;
};
