import { describe, expect, it, beforeEach } from "vitest";
import {
  applySuiteTheme,
  cycleSuiteThemePreference,
  parseSuiteThemePreference,
  prefersReducedMotion,
  readSuiteThemePreference,
  resolveSuiteTheme,
  toggleSuiteThemePreference,
  writeSuiteThemePreference,
  SUITE_THEME_STORAGE_KEY,
} from "./theme";

describe("suite theme helpers", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.classList.remove("dark");
  });

  it("resolves system against prefers-color-scheme", () => {
    expect(resolveSuiteTheme("system", true)).toBe("dark");
    expect(resolveSuiteTheme("system", false)).toBe("light");
    expect(resolveSuiteTheme("light", true)).toBe("light");
    expect(resolveSuiteTheme("dark", false)).toBe("dark");
  });

  it("reads prefers-reduced-motion", () => {
    expect(prefersReducedMotion({ matches: true } as MediaQueryList)).toBe(
      true,
    );
    expect(prefersReducedMotion({ matches: false } as MediaQueryList)).toBe(
      false,
    );
    expect(prefersReducedMotion(null)).toBe(false);
  });

  it("defaults to system when storage is empty", () => {
    expect(readSuiteThemePreference(localStorage)).toBe("system");
  });

  it("migrates legacy theme key", () => {
    localStorage.setItem("theme", "light");
    expect(readSuiteThemePreference(localStorage)).toBe("light");
  });

  it("persists suite-theme and mirrors legacy for explicit modes", () => {
    writeSuiteThemePreference("dark", localStorage);
    expect(localStorage.getItem(SUITE_THEME_STORAGE_KEY)).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    writeSuiteThemePreference("system", localStorage);
    expect(localStorage.getItem(SUITE_THEME_STORAGE_KEY)).toBe("system");
    expect(localStorage.getItem("theme")).toBeNull();
  });

  it("toggles and cycles preferences", () => {
    expect(toggleSuiteThemePreference("system", true)).toBe("light");
    expect(toggleSuiteThemePreference("light", false)).toBe("dark");
    expect(cycleSuiteThemePreference("system")).toBe("light");
    expect(cycleSuiteThemePreference("dark")).toBe("system");
  });

  it("applies data-theme and dark class", () => {
    expect(applySuiteTheme("light")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(applySuiteTheme("light")).toBe(false);
    expect(applySuiteTheme("dark")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(applySuiteTheme("dark")).toBe(false);
  });

  it("parses only known preferences", () => {
    expect(parseSuiteThemePreference("system")).toBe("system");
    expect(parseSuiteThemePreference("nope")).toBeNull();
  });
});
