/**
 * Optional browser globals for suite chrome (search palette, cookie, bug report).
 * Surfaces register handlers; callers invoke without deep coupling.
 */

export type DemlWidgets = {
  openSearch?: () => void;
  closeSearch?: () => void;
  openCookieSettings?: () => void;
  openBugReport?: () => void;
};

export type DemlGlobal = typeof globalThis & {
  DemlWidgets?: DemlWidgets;
};

export function readDemlWidgets(): DemlWidgets {
  if (typeof globalThis === "undefined") {
    return {};
  }
  return (globalThis as DemlGlobal).DemlWidgets ?? {};
}

export function writeDemlWidgets(patch: DemlWidgets): DemlWidgets {
  const next: DemlWidgets = { ...readDemlWidgets(), ...patch };
  if (typeof globalThis !== "undefined") {
    (globalThis as DemlGlobal).DemlWidgets = next;
  }
  return next;
}
