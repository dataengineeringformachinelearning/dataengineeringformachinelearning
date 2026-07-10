import {
  DEFAULT_SITE_URLS,
  type SiteDrakkarContext,
  type SiteUrls,
  resolveBrandHref,
  resolveNavHref,
  SITE_NAV_LINKS,
  visibleNavLinks,
} from "../../lib/site-drakkar/site-drakkar.config";
import { attachShadowStyles, readBoolAttr } from "../core/base";
import {
  defineCustomElement,
  escapeHtml,
  HTMLElementBase,
  modKeyLabel,
} from "../core/dom";
import { renderInlineIcon } from "../core/icons-inline";
import {
  registerVikingSuiteSearchPaletteWc,
  type VikingSuiteSearchPaletteWc,
} from "../suite-search-palette/viking-suite-search-palette-wc";
import { registerVikingThemeToggleWc } from "../theme-toggle/viking-theme-toggle-wc";

const VALID_CONTEXTS = new Set<SiteDrakkarContext>([
  "app",
  "marketing",
  "backend",
  "docs",
]);

const VIKING_SUITE_HEADER_STYLES = `
:host {
  display: block;
  position: sticky;
  top: 0;
  z-index: var(--viking-z-sticky, 50);
  color: var(--viking-text);
  font-family: var(--viking-font-family);
}

* {
  box-sizing: border-box;
}

.suite-header {
  width: 100%;
  min-height: var(--viking-navbar-height, var(--viking-space-8));
  background: var(--viking-surface);
  border-bottom: var(--viking-border-width, 1px) solid var(--viking-border);
  box-shadow: var(--viking-shadow-xs);
  isolation: isolate;
}

.suite-header__bar {
  display: grid;
  grid-template-columns: minmax(max-content, auto) minmax(0, 1fr) max-content;
  align-items: center;
  gap: var(--viking-space-1);
  width: 100%;
  max-width: var(--viking-container-max-width);
  min-height: var(--viking-navbar-height, var(--viking-space-8));
  margin-inline: auto;
  padding-inline: var(--viking-page-gutter);
}

.suite-header__brand {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--viking-space-1);
  min-width: 0;
  min-height: var(--viking-control-height);
  color: var(--viking-text);
  text-decoration: none;
  border-radius: var(--viking-radius);
}

.suite-header__brand:focus-visible,
.suite-header__link:focus-visible,
.suite-header__icon-button:focus-visible,
.suite-header__auth-link:focus-visible,
.suite-header__user-trigger:focus-visible,
.suite-header__menu-link:focus-visible,
.suite-header__menu-button:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
}

.suite-header__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--viking-space-4);
  height: var(--viking-space-4);
  color: var(--viking-accent);
  flex: 0 0 auto;
}

.suite-header__lockup {
  display: none;
  min-width: 0;
  color: var(--viking-text);
  font-size: var(--viking-font-size-sm);
  font-weight: var(--viking-font-weight-bold);
  line-height: var(--viking-line-height-tight);
  letter-spacing: var(--viking-letter-spacing-caps);
  text-transform: uppercase;
  white-space: nowrap;
}

.suite-header__nav {
  display: none;
  align-items: center;
  justify-content: center;
  gap: var(--viking-space-0-5);
  min-width: 0;
  overflow: hidden;
}

.suite-header__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--viking-space-0-5);
  min-width: 0;
  height: var(--viking-control-height);
  padding-inline: var(--viking-space-2);
  color: var(--viking-text-muted);
  border-radius: var(--viking-radius) var(--viking-radius) 0 0;
  font-size: var(--viking-font-size-sm);
  font-weight: var(--viking-font-weight-semibold);
  line-height: var(--viking-line-height-none);
  letter-spacing: var(--viking-letter-spacing-caps);
  text-decoration: none;
  text-transform: uppercase;
  white-space: nowrap;
  transition: var(--viking-transition-interactive);
}

.suite-header__link:hover,
.suite-header__link[aria-current='page'] {
  color: var(--viking-text);
  background: var(--viking-surface-alt);
}

.suite-header__actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--viking-space-1);
  min-width: 0;
}

.suite-header__icon-button,
.suite-header__menu-button,
.suite-header__user-trigger,
.suite-header__auth-link {
  min-height: var(--viking-control-height);
  border: var(--viking-border-width, 1px) solid var(--viking-border-strong);
  border-radius: var(--viking-radius);
  background: var(--viking-surface);
  color: var(--viking-text);
  box-shadow: var(--viking-shadow-sm);
  cursor: pointer;
  font-family: inherit;
  transition: var(--viking-transition-interactive);
  -webkit-tap-highlight-color: transparent;
}

.suite-header__icon-button,
.suite-header__menu-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--viking-control-height);
  min-width: var(--viking-control-height);
  padding: 0;
}

.suite-header__icon-button:hover,
.suite-header__menu-button:hover,
.suite-header__user-trigger:hover,
.suite-header__auth-link:hover {
  border-color: var(--viking-accent-strong);
  background: var(--viking-surface-alt);
  box-shadow: var(--viking-shadow-md);
}

.suite-header__auth-link {
  display: none;
  align-items: center;
  justify-content: center;
  gap: var(--viking-space-0-5);
  min-width: max-content;
  padding-inline: var(--viking-space-2);
  background: var(--viking-accent);
  border-color: var(--viking-accent);
  color: var(--viking-accent-content);
  font-size: var(--viking-font-size-sm);
  font-weight: var(--viking-font-weight-bold);
  line-height: var(--viking-line-height-none);
  letter-spacing: var(--viking-letter-spacing-caps);
  text-decoration: none;
  text-transform: uppercase;
}

.suite-header__auth-icon,
.suite-header__menu-icon,
.suite-header__action-icon,
.suite-header__avatar-icon,
.suite-header__chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.suite-header__auth-link:hover {
  background: var(--viking-accent-hover);
  color: var(--viking-accent-content);
}

.suite-header__user {
  position: relative;
  display: none;
}

.suite-header__user-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--viking-space-1);
  min-width: max-content;
  padding-inline: var(--viking-space-1);
}

.suite-header__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--viking-space-3);
  height: var(--viking-space-3);
  border-radius: var(--viking-radius-full);
  background: var(--viking-accent-soft);
  color: var(--viking-accent-strong);
}

.suite-header__user-text {
  display: none;
  max-width: var(--viking-space-16);
  overflow: hidden;
  color: var(--viking-text);
  font-size: var(--viking-font-size-sm);
  font-weight: var(--viking-font-weight-semibold);
  line-height: var(--viking-line-height-tight);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.suite-header__menu {
  position: absolute;
  inset-block-start: calc(100% + var(--viking-space-1));
  inset-inline-end: 0;
  display: none;
  min-width: var(--viking-space-24);
  padding: var(--viking-space-1);
  background: var(--viking-surface);
  border: var(--viking-border-width, 1px) solid var(--viking-border-strong);
  border-radius: var(--viking-radius);
  box-shadow: var(--viking-shadow-lg);
}

.suite-header__user[data-open='true'] .suite-header__menu {
  display: grid;
  gap: var(--viking-space-0-5);
}

.suite-header__menu-label {
  padding: var(--viking-space-1);
  color: var(--viking-text-muted);
  font-size: var(--viking-font-size-xs);
  line-height: var(--viking-line-height-tight);
}

.suite-header__menu-label strong {
  display: block;
  color: var(--viking-text);
  font-size: var(--viking-font-size-sm);
}

.suite-header__menu-link,
.suite-header__menu-button {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--viking-space-1);
  width: 100%;
  min-height: var(--viking-control-height);
  padding-inline: var(--viking-space-1);
  background: transparent;
  border: 0;
  border-radius: var(--viking-radius-sm);
  box-shadow: none;
  color: var(--viking-text);
  font: inherit;
  text-align: start;
  text-decoration: none;
}

.suite-header__menu-link:hover,
.suite-header__menu-button:hover {
  background: var(--viking-surface-alt);
}

.suite-header__mobile {
  display: none;
  width: 100%;
  max-width: var(--viking-container-max-width);
  margin-inline: auto;
  padding: 0 var(--viking-page-gutter) var(--viking-space-2);
}

.suite-header[data-menu-open='true'] .suite-header__mobile {
  display: grid;
  gap: var(--viking-space-1);
}

.suite-header__mobile .suite-header__link,
.suite-header__mobile .suite-header__auth-link,
.suite-header__mobile .suite-header__menu-button {
  display: inline-flex;
  justify-content: flex-start;
  width: 100%;
  border-radius: var(--viking-radius);
}

.suite-header__mobile .suite-header__auth-link {
  justify-content: center;
  margin-block-start: var(--viking-space-1);
}

viking-suite-command-palette {
  display: contents;
}

@media (min-width: 520px) {
  .suite-header__lockup,
  .suite-header__user-text {
    display: inline;
  }
}

@media (min-width: 768px) {
  .suite-header__bar {
    padding-inline: var(--viking-page-gutter-lg);
  }

  .suite-header__nav {
    display: flex;
  }

  .suite-header__auth-link,
  .suite-header__user {
    display: inline-flex;
  }

  .suite-header__menu-button {
    display: none;
  }

  .suite-header[data-menu-open='true'] .suite-header__mobile {
    display: none;
  }
}
`;

const detectContext = (): SiteDrakkarContext => {
  const explicit = document.documentElement.getAttribute("data-deml-context");
  if (explicit && VALID_CONTEXTS.has(explicit as SiteDrakkarContext)) {
    return explicit as SiteDrakkarContext;
  }

  const host = window.location.hostname;
  if (host.startsWith("ui.")) {
    return "docs";
  }
  if (host.startsWith("backend.")) {
    return "backend";
  }
  if (host.includes("deml.app")) {
    return "app";
  }
  return "marketing";
};

const readContext = (el: HTMLElement): SiteDrakkarContext => {
  const raw = el.getAttribute("context");
  if (raw && VALID_CONTEXTS.has(raw as SiteDrakkarContext)) {
    return raw as SiteDrakkarContext;
  }
  return detectContext();
};

const readUrls = (el: HTMLElement): SiteUrls => {
  const env = (globalThis as { __DEML?: Partial<SiteUrls> }).__DEML ?? {};
  return {
    app: el.getAttribute("app-url") ?? env.app ?? DEFAULT_SITE_URLS.app,
    marketing:
      el.getAttribute("marketing-url") ??
      env.marketing ??
      DEFAULT_SITE_URLS.marketing,
    backend:
      el.getAttribute("backend-url") ??
      env.backend ??
      DEFAULT_SITE_URLS.backend,
  };
};

const isCurrentHref = (href: string): boolean => {
  try {
    const url = new URL(href, window.location.origin);
    return (
      url.origin === window.location.origin &&
      url.pathname === window.location.pathname
    );
  } catch {
    return false;
  }
};

/**
 * Unified framework-agnostic DEML suite header.
 * Tag: `viking-suite-header`
 *
 * @attr context - Surface: app | marketing | backend | docs (auto-detected when omitted)
 * @attr authenticated - Render the user menu instead of Sign In
 * @attr user-name - Display name for the authenticated user menu
 * @attr user-email - Secondary user menu label
 * @attr sign-in-href - Fallback href for static Sign In navigation
 */
export class VikingSuiteHeaderWc extends HTMLElementBase {
  static readonly tag = "viking-suite-header";

  static get observedAttributes(): string[] {
    return [
      "context",
      "app-url",
      "marketing-url",
      "backend-url",
      "authenticated",
      "user-name",
      "user-email",
      "sign-in-href",
      "dashboard-href",
    ];
  }

  private readonly shadow: ShadowRoot;
  private menuOpen = false;
  private userMenuOpen = false;
  private paletteEl: VikingSuiteSearchPaletteWc | null = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    attachShadowStyles(this.shadow, VIKING_SUITE_HEADER_STYLES);
  }

  connectedCallback(): void {
    registerVikingThemeToggleWc();
    registerVikingSuiteSearchPaletteWc();
    this.render();
    document.addEventListener("click", this.onDocumentClick);
  }

  disconnectedCallback(): void {
    document.removeEventListener("click", this.onDocumentClick);
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.render();
    }
  }

  openSearch(): void {
    this.paletteEl?.openPalette();
    this.dispatchEvent(
      new CustomEvent("viking-search-open", { bubbles: true, composed: true }),
    );
  }

  private readonly onDocumentClick = (event: MouseEvent): void => {
    if (event.composedPath().includes(this)) {
      return;
    }
    if (this.menuOpen || this.userMenuOpen) {
      this.menuOpen = false;
      this.userMenuOpen = false;
      this.syncOpenState();
    }
  };

  private readonly onSearchClick = (): void => {
    this.openSearch();
  };

  private readonly onMenuClick = (): void => {
    this.menuOpen = !this.menuOpen;
    this.syncOpenState();
  };

  private readonly onUserClick = (): void => {
    this.userMenuOpen = !this.userMenuOpen;
    this.syncOpenState();
  };

  private readonly onSignInClick = (event: Event): void => {
    const signInEvent = new CustomEvent("viking-sign-in", {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: event,
    });
    this.dispatchEvent(signInEvent);
    if (signInEvent.defaultPrevented) {
      event.preventDefault();
    }
  };

  private readonly onSignOutClick = (): void => {
    this.userMenuOpen = false;
    this.menuOpen = false;
    this.syncOpenState();
    this.dispatchEvent(
      new CustomEvent("viking-sign-out", { bubbles: true, composed: true }),
    );
  };

  private syncOpenState(): void {
    const header = this.shadow.querySelector<HTMLElement>(".suite-header");
    const menuButton =
      this.shadow.querySelector<HTMLButtonElement>("[data-menu-toggle]");
    const user = this.shadow.querySelector<HTMLElement>(".suite-header__user");
    const userButton =
      this.shadow.querySelector<HTMLButtonElement>("[data-user-toggle]");
    header?.setAttribute("data-menu-open", String(this.menuOpen));
    menuButton?.setAttribute("aria-expanded", String(this.menuOpen));
    user?.setAttribute("data-open", String(this.userMenuOpen));
    userButton?.setAttribute("aria-expanded", String(this.userMenuOpen));
  }

  private renderNavLinks(
    context: SiteDrakkarContext,
    urls: SiteUrls,
    authenticated: boolean,
  ): string {
    return visibleNavLinks(SITE_NAV_LINKS, authenticated)
      .map((link) => {
        const href = resolveNavHref(link, context, urls);
        const current = isCurrentHref(href) ? ' aria-current="page"' : "";
        return `
          <a class="suite-header__link" href="${escapeHtml(href)}"${current}>
            ${renderInlineIcon(link.icon, 16, "suite-header__link-icon")}
            <span>${escapeHtml(link.label)}</span>
          </a>
        `;
      })
      .join("");
  }

  private renderAuth(
    urls: SiteUrls,
    authenticated: boolean,
    mobile = false,
  ): string {
    if (!authenticated) {
      const signInHref =
        this.getAttribute("sign-in-href") ?? `${urls.app}/login`;
      return `
        <a class="suite-header__auth-link" href="${escapeHtml(signInHref)}" data-sign-in>
          <span>Sign In</span>
          ${renderInlineIcon("arrow-right", 16, "suite-header__auth-icon")}
        </a>
      `;
    }

    if (mobile) {
      return `
        <a class="suite-header__menu-link" href="${escapeHtml(this.getDashboardHref(urls))}">
          ${renderInlineIcon("home", 16, "suite-header__menu-icon")}
          <span>Dashboard</span>
        </a>
        <button class="suite-header__menu-button" type="button" data-sign-out>
          ${renderInlineIcon("log-out", 16, "suite-header__menu-icon")}
          <span>Sign Out</span>
        </button>
      `;
    }

    const userName = this.getAttribute("user-name") ?? "Account";
    const userEmail = this.getAttribute("user-email") ?? "";
    return `
      <div class="suite-header__user" data-open="${String(this.userMenuOpen)}">
        <button
          class="suite-header__user-trigger"
          type="button"
          aria-haspopup="menu"
          aria-expanded="${String(this.userMenuOpen)}"
          data-user-toggle
        >
          <span class="suite-header__avatar" aria-hidden="true">
            ${renderInlineIcon("user", 16, "suite-header__avatar-icon")}
          </span>
          <span class="suite-header__user-text">${escapeHtml(userName)}</span>
          ${renderInlineIcon("chevron-down", 16, "suite-header__chevron")}
        </button>
        <div class="suite-header__menu" role="menu">
          <div class="suite-header__menu-label">
            <strong>${escapeHtml(userName)}</strong>
            ${userEmail ? `<span>${escapeHtml(userEmail)}</span>` : ""}
          </div>
          <a class="suite-header__menu-link" role="menuitem" href="${escapeHtml(
            this.getDashboardHref(urls),
          )}">
            ${renderInlineIcon("home", 16, "suite-header__menu-icon")}
            <span>Dashboard</span>
          </a>
          <button class="suite-header__menu-button" type="button" role="menuitem" data-sign-out>
            ${renderInlineIcon("log-out", 16, "suite-header__menu-icon")}
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    `;
  }

  private getDashboardHref(urls: SiteUrls): string {
    return this.getAttribute("dashboard-href") ?? `${urls.app}/dashboard`;
  }

  private render(): void {
    const context = readContext(this);
    const urls = readUrls(this);
    const authenticated = readBoolAttr(this, "authenticated");
    const navLinks = this.renderNavLinks(context, urls, authenticated);
    const brandHref = resolveBrandHref(context, urls);
    const shortcut = `${modKeyLabel()}K`;

    this.shadow.innerHTML = `
      <header class="suite-header" data-menu-open="${String(this.menuOpen)}">
        <div class="suite-header__bar">
          <a class="suite-header__brand" href="${escapeHtml(
            brandHref,
          )}" aria-label="Data Engineering for AI Engineering and Cybersecurity home">
            <span class="suite-header__mark" aria-hidden="true">
              ${renderInlineIcon("drakkar", 28, "suite-header__brand-icon")}
            </span>
            <span class="suite-header__lockup">DEML</span>
          </a>

          <nav class="suite-header__nav" aria-label="Main navigation">
            ${navLinks}
          </nav>

          <div class="suite-header__actions">
            <button
              class="suite-header__icon-button"
              type="button"
              aria-label="Open command palette (${shortcut})"
              title="Open command palette (${shortcut})"
              data-search-trigger
            >
              ${renderInlineIcon("search", 18, "suite-header__action-icon")}
            </button>
            ${this.renderAuth(urls, authenticated)}
            <viking-theme-toggle-wc></viking-theme-toggle-wc>
            <button
              class="suite-header__menu-button"
              type="button"
              aria-label="Toggle navigation menu"
              aria-expanded="${String(this.menuOpen)}"
              data-menu-toggle
            >
              ${renderInlineIcon(this.menuOpen ? "x" : "menu", 18, "suite-header__action-icon")}
            </button>
          </div>
        </div>

        <nav class="suite-header__mobile" aria-label="Mobile navigation">
          ${navLinks}
          ${this.renderAuth(urls, authenticated, true)}
        </nav>
      </header>
      <viking-suite-command-palette
        context="${context}"
        app-url="${escapeHtml(urls.app)}"
        marketing-url="${escapeHtml(urls.marketing)}"
        backend-url="${escapeHtml(urls.backend)}"
        global-shortcut
      ></viking-suite-command-palette>
    `;

    this.paletteEl = this.shadow.querySelector("viking-suite-command-palette");
    this.shadow
      .querySelector("[data-search-trigger]")
      ?.addEventListener("click", this.onSearchClick);
    this.shadow
      .querySelector("[data-menu-toggle]")
      ?.addEventListener("click", this.onMenuClick);
    this.shadow
      .querySelector("[data-user-toggle]")
      ?.addEventListener("click", this.onUserClick);
    this.shadow
      .querySelectorAll("[data-sign-in]")
      .forEach((control) =>
        control.addEventListener("click", this.onSignInClick),
      );
    this.shadow
      .querySelectorAll("[data-sign-out]")
      .forEach((control) =>
        control.addEventListener("click", this.onSignOutClick),
      );
  }
}

export const registerVikingSuiteHeaderWc = (): void => {
  defineCustomElement(VikingSuiteHeaderWc.tag, VikingSuiteHeaderWc);
};
