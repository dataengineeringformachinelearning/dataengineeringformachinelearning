import { attachShadowStyles } from "../core/base";
import { defineCustomElement, HTMLElementBase } from "../core/dom";
import {
  SUITE_THEME_CHANGE_EVENT,
  applySuiteTheme,
  dispatchSuiteThemeChange,
  ensureSuiteSystemThemeListener,
  prefersDarkScheme,
  readSuiteThemePreference,
  resolveSuiteTheme,
  toggleSuiteThemePreference,
  writeSuiteThemePreference,
  type SuiteThemePreference,
  type SuiteThemeResolved,
} from "../../core/theme";

const VIKING_THEME_TOGGLE_STYLES = `
:host { display: inline-flex; }
.theme-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--suite-control-height, var(--viking-control-height, 40px));
  height: var(--suite-control-height, var(--viking-control-height, 40px));
  min-width: var(--suite-touch, 44px);
  min-height: var(--suite-touch, 44px);
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--suite-primary, var(--viking-accent)) 32%, var(--suite-border-strong, var(--viking-border)));
  border-radius: var(--suite-radius-control, var(--viking-radius));
  background: color-mix(in srgb, var(--suite-primary, var(--viking-accent)) 8%, var(--suite-surface, var(--viking-surface)));
  color: var(--suite-primary, var(--viking-accent-strong, var(--viking-ring)));
  box-shadow: var(--suite-shadow-sm, var(--viking-shadow-sm));
  cursor: pointer;
  transition: var(--suite-transition, var(--viking-transition-interactive));
  -webkit-tap-highlight-color: transparent;
}
.theme-toggle-btn:hover {
  border-color: var(--suite-primary-hover, var(--viking-accent-strong));
  background: color-mix(in srgb, var(--suite-primary, var(--viking-accent)) 14%, var(--suite-surface-2, var(--viking-surface-alt)));
  box-shadow: var(--suite-shadow-md, var(--viking-shadow-md));
}
.theme-toggle-btn:focus-visible {
  outline: var(--suite-ring-width, 2px) solid var(--suite-ring, var(--viking-ring));
  outline-offset: var(--suite-ring-offset, 2px);
}
.theme-icon { display: none; }
.theme-icon.is-visible { display: block; }
@media (min-width: 768px) {
  .theme-toggle-btn {
    min-width: var(--suite-control-height, 40px);
    min-height: var(--suite-control-height, 40px);
  }
}
`;

const currentResolved = (): SuiteThemeResolved =>
  resolveSuiteTheme(readSuiteThemePreference(), prefersDarkScheme());

/**
 * Framework-agnostic theme toggle Web Component.
 * Tag: `viking-theme-toggle-wc`
 */
export class VikingThemeToggleWc extends HTMLElementBase {
  static readonly tag = "viking-theme-toggle-wc";

  private readonly shadow: ShadowRoot;
  private button: HTMLButtonElement | null = null;
  private sunIcon: SVGElement | null = null;
  private moonIcon: SVGElement | null = null;

  private readonly onStorage = (): void => {
    this.syncIcons();
  };

  private readonly onThemeChange = (): void => {
    this.syncIcons();
  };

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    attachShadowStyles(this.shadow, VIKING_THEME_TOGGLE_STYLES);
  }

  connectedCallback(): void {
    this.render();
    this.syncIcons();
    this.button?.addEventListener("click", this.onClick);
    window.addEventListener("storage", this.onStorage);
    // Canonical event only — avoid double sync from legacy viking-theme-change
    window.addEventListener(SUITE_THEME_CHANGE_EVENT, this.onThemeChange);
    // One document-level OS sync; this instance only refreshes icons
    ensureSuiteSystemThemeListener();
  }

  disconnectedCallback(): void {
    this.button?.removeEventListener("click", this.onClick);
    window.removeEventListener("storage", this.onStorage);
    window.removeEventListener(SUITE_THEME_CHANGE_EVENT, this.onThemeChange);
  }

  private readonly onClick = (): void => {
    const preference = readSuiteThemePreference();
    const next: SuiteThemePreference = toggleSuiteThemePreference(
      preference,
      prefersDarkScheme(),
    );
    writeSuiteThemePreference(next);
    const resolved = resolveSuiteTheme(next, prefersDarkScheme());
    applySuiteTheme(resolved);
    dispatchSuiteThemeChange({ preference: next, resolved });
    this.syncIcons();
  };

  private syncIcons = (): void => {
    const isDark = currentResolved() === "dark";
    this.sunIcon?.classList.toggle("is-visible", isDark);
    this.moonIcon?.classList.toggle("is-visible", !isDark);
    const pref = readSuiteThemePreference();
    const label =
      pref === "system"
        ? isDark
          ? "Theme: system (dark). Switch to light"
          : "Theme: system (light). Switch to dark"
        : isDark
          ? "Theme: dark. Switch to light"
          : "Theme: light. Switch to dark";
    this.button?.setAttribute("aria-label", label);
    this.button?.setAttribute("title", label);
  };

  private render(): void {
    const label =
      this.getAttribute("aria-label") ?? "Toggle light and dark theme";
    this.shadow.innerHTML = `
      <button type="button" class="theme-toggle-btn suite-theme-toggle" part="control" aria-label="${label}">
        <svg class="theme-icon theme-icon-sun" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
          <path stroke="currentColor" stroke-width="2" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
        </svg>
        <svg class="theme-icon theme-icon-moon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
        </svg>
      </button>
    `;
    attachShadowStyles(this.shadow, VIKING_THEME_TOGGLE_STYLES);
    this.button = this.shadow.querySelector("button");
    this.sunIcon = this.shadow.querySelector(".theme-icon-sun");
    this.moonIcon = this.shadow.querySelector(".theme-icon-moon");
  }
}

export const registerVikingThemeToggleWc = (): void => {
  defineCustomElement(VikingThemeToggleWc.tag, VikingThemeToggleWc);
};
