/**
 * Suite theme preference — light / dark / system.
 * Persist preference; resolve against prefers-color-scheme; apply data-theme.
 */

export type SuiteThemePreference = "light" | "dark" | "system";
export type SuiteThemeResolved = "light" | "dark";

/** Canonical storage key (migrates legacy `theme`). */
export const SUITE_THEME_STORAGE_KEY = "suite-theme";
const LEGACY_THEME_STORAGE_KEY = "theme";

export const SUITE_THEME_CHANGE_EVENT = "suite-theme-change";

export function prefersDarkScheme(
  media: MediaQueryList | null | undefined = typeof window !== "undefined"
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null,
): boolean {
  return media?.matches ?? true;
}

/** WCAG 2.3.3 — true when the user asks for reduced motion. */
export function prefersReducedMotion(
  media: MediaQueryList | null | undefined = typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null,
): boolean {
  return media?.matches ?? false;
}

export function resolveSuiteTheme(
  preference: SuiteThemePreference,
  systemPrefersDark: boolean = prefersDarkScheme(),
): SuiteThemeResolved {
  if (preference === "system") {
    return systemPrefersDark ? "dark" : "light";
  }
  return preference;
}

/** Accessible name for the suite theme toggle (voice / SR). */
export function suiteThemeToggleAriaLabel(
  preference: SuiteThemePreference,
  resolved: SuiteThemeResolved,
): string {
  if (preference === "system") {
    return resolved === "dark"
      ? "Theme: system (dark). Switch to light"
      : "Theme: system (light). Switch to dark";
  }
  return resolved === "dark"
    ? "Theme: dark. Switch to light"
    : "Theme: light. Switch to dark";
}

export function parseSuiteThemePreference(
  value: string | null | undefined,
): SuiteThemePreference | null {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return null;
}

/** Read preference: suite-theme → legacy theme → system. */
export function readSuiteThemePreference(
  storage: Pick<Storage, "getItem"> | null | undefined = typeof localStorage !==
  "undefined"
    ? localStorage
    : null,
): SuiteThemePreference {
  if (!storage) return "system";
  const modern = parseSuiteThemePreference(
    storage.getItem(SUITE_THEME_STORAGE_KEY),
  );
  if (modern) return modern;
  const legacy = parseSuiteThemePreference(
    storage.getItem(LEGACY_THEME_STORAGE_KEY),
  );
  // Legacy only stored light|dark — treat as explicit preference.
  if (legacy === "light" || legacy === "dark") return legacy;
  return "system";
}

export function writeSuiteThemePreference(
  preference: SuiteThemePreference,
  storage:
    | Pick<Storage, "setItem" | "removeItem">
    | null
    | undefined = typeof localStorage !== "undefined" ? localStorage : null,
): void {
  if (!storage) return;
  storage.setItem(SUITE_THEME_STORAGE_KEY, preference);
  // Keep legacy key in sync for older FOUC scripts / WC readers.
  if (preference === "system") {
    storage.removeItem(LEGACY_THEME_STORAGE_KEY);
  } else {
    storage.setItem(LEGACY_THEME_STORAGE_KEY, preference);
  }
}

/** Apply resolved theme to the document. Returns true when DOM actually changed. */
export function applySuiteTheme(
  resolved: SuiteThemeResolved,
  root: HTMLElement | null = typeof document !== "undefined"
    ? document.documentElement
    : null,
): boolean {
  if (!root) return false;
  const already =
    root.getAttribute("data-theme") === resolved &&
    root.style.colorScheme === resolved &&
    root.classList.contains("dark") === (resolved === "dark");
  if (already) return false;
  root.setAttribute("data-theme", resolved);
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  return true;
}

export function dispatchSuiteThemeChange(
  detail: {
    preference: SuiteThemePreference;
    resolved: SuiteThemeResolved;
  },
  target: EventTarget | null = typeof window !== "undefined" ? window : null,
): void {
  if (!target) return;
  target.dispatchEvent(
    new CustomEvent(SUITE_THEME_CHANGE_EVENT, {
      bubbles: true,
      detail,
    }),
  );
}

// --- Single OS preference sync (shared by WC + any static hosts) ---
let systemThemeListenerBound = false;

/**
 * Idempotent document-level listener: when preference is `system`, re-apply
 * on OS scheme changes. Avoids N theme-toggle instances each rewriting DOM.
 */
export function ensureSuiteSystemThemeListener(): void {
  if (systemThemeListenerBound || typeof window === "undefined") return;
  if (typeof window.matchMedia !== "function") return;
  systemThemeListenerBound = true;
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", () => {
    if (readSuiteThemePreference() !== "system") return;
    const resolved = resolveSuiteTheme("system", prefersDarkScheme(media));
    if (applySuiteTheme(resolved)) {
      dispatchSuiteThemeChange({ preference: "system", resolved });
    }
  });
}

/** Toggle resolved appearance and persist as an explicit light/dark choice. */
export function toggleSuiteThemePreference(
  preference: SuiteThemePreference,
  systemPrefersDark: boolean = prefersDarkScheme(),
): SuiteThemePreference {
  const resolved = resolveSuiteTheme(preference, systemPrefersDark);
  return resolved === "dark" ? "light" : "dark";
}

/** Cycle system → light → dark → system (for controls that expose all modes). */
export function cycleSuiteThemePreference(
  preference: SuiteThemePreference,
): SuiteThemePreference {
  switch (preference) {
    case "system":
      return "light";
    case "light":
      return "dark";
    case "dark":
      return "system";
  }
}

/**
 * Inline FOUC bootstrap (copy into <head> scripts).
 * Mirrors read → resolve → apply without writing storage.
 */
export function bootstrapSuiteThemeInline(): string {
  return `(function(){try{var k=${JSON.stringify(SUITE_THEME_STORAGE_KEY)};var legacy=${JSON.stringify(LEGACY_THEME_STORAGE_KEY)};var p=localStorage.getItem(k)||localStorage.getItem(legacy);var pref=(p==='light'||p==='dark'||p==='system')?p:'system';var dark=window.matchMedia('(prefers-color-scheme: dark)').matches;var theme=pref==='system'?(dark?'dark':'light'):pref;var r=document.documentElement;r.setAttribute('data-theme',theme);r.classList.toggle('dark',theme==='dark');r.style.colorScheme=theme;}catch(e){}})();`;
}
