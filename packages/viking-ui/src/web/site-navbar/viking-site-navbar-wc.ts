import {
  DEFAULT_SITE_URLS,
  SITE_NAV_LINKS,
  SiteDrakkarContext,
  SiteUrls,
  resolveBrandHref,
  resolveNavHref,
} from "../../lib/site-drakkar/site-drakkar.config";
import {
  defineCustomElement,
  defineCustomElementAlias,
  escapeHtml,
} from "../core/dom";
import { renderInlineIcon } from "../core/icons-inline";

const VALID_CONTEXTS = new Set<SiteDrakkarContext>([
  "app",
  "marketing",
  "backend",
  "docs",
]);

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
  const attr = el.getAttribute("context") as SiteDrakkarContext | null;
  if (attr && VALID_CONTEXTS.has(attr)) {
    return attr;
  }
  return detectContext();
};

const readBoolAttr = (el: HTMLElement, name: string): boolean => {
  const value = el.getAttribute(name);
  return value !== null && value !== "false";
};

const readUrls = (el: HTMLElement): SiteUrls => {
  const env =
    (globalThis as { __DEML?: Partial<SiteUrls> & Record<string, string> })
      .__DEML ?? {};
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

const readAuthState = (el: HTMLElement): boolean =>
  readBoolAttr(el, "authenticated");

const readShowSearch = (el: HTMLElement): boolean => {
  const explicit = el.getAttribute("show-search");
  if (explicit === null) {
    return true;
  }
  return readBoolAttr(el, "show-search");
};

const readSignInHref = (el: HTMLElement, urls: SiteUrls): string => {
  const explicit = el.getAttribute("sign-in-href");
  if (explicit) {
    return explicit;
  }
  const landing = el.getAttribute("return-url") ?? window.location.href;
  return `${urls.app}/login?returnUrl=${encodeURIComponent(landing)}`;
};

const renderNavIcon = (
  name: string,
  size: number,
  options: { color?: string; id?: string; className?: string } = {},
): string => {
  const id = options.id ? ` id="${escapeHtml(options.id)}"` : "";
  const color = options.color
    ? ` data-viking-icon-color="${escapeHtml(options.color)}"`
    : "";
  const className = options.className
    ? ` class="${escapeHtml(options.className)}"`
    : "";
  return `<span${id}${className} data-viking-icon="${escapeHtml(name)}" data-viking-icon-size="${size}"${color} aria-hidden="true">${renderInlineIcon(name, size, "viking-navbar-inline-icon")}</span>`;
};

/**
 * viking-site-navbar-wc — unified static Drakkar navbar for non-Angular surfaces.
 * Styling is supplied by viking-ui global CSS.
 */
export class VikingSiteNavbarWc extends HTMLElement {
  static readonly tag = "viking-site-navbar";
  static readonly legacyTag = "viking-site-navbar-wc";

  static get observedAttributes(): string[] {
    return [
      "context",
      "app-url",
      "marketing-url",
      "backend-url",
      "authenticated",
      "show-search",
      "sign-in-href",
      "dashboard-href",
      "return-url",
    ];
  }

  private mobileMenuOpen = false;

  connectedCallback(): void {
    this.render();
    this.addEventListener("click", this.onHostClick);
    document.addEventListener("click", this.onDocumentClick);
    document.addEventListener("keydown", this.onDocumentKeydown);
    window.addEventListener("resize", this.onWindowResize);
  }

  disconnectedCallback(): void {
    this.removeEventListener("click", this.onHostClick);
    document.removeEventListener("click", this.onDocumentClick);
    document.removeEventListener("keydown", this.onDocumentKeydown);
    window.removeEventListener("resize", this.onWindowResize);
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.render();
    }
  }

  private renderNavLinks(
    context: SiteDrakkarContext,
    urls: SiteUrls,
    kind: "desktop" | "mobile" = "desktop",
  ): string {
    const linkClass = kind === "mobile" ? "mobile-nav-btn" : "nav-btn";
    return SITE_NAV_LINKS.map((link) => {
      const href = resolveNavHref(link, context, urls);
      const isProtected = link.requireAuth;
      const hidden = isProtected ? " hidden" : "";
      const authAttr = isProtected ? ' data-require-auth="true"' : "";

      return `
        <a
          href="${escapeHtml(href)}"
          class="${linkClass}"
          data-nav-id="${escapeHtml(link.id)}"
          ${authAttr}
          ${hidden}
        >
          ${renderNavIcon(link.icon, 16)}
          <span>${escapeHtml(link.label)}</span>
        </a>
      `;
    }).join("");
  }

  private renderAuthDesktop(
    authenticated: boolean,
    signInHref: string,
    dashboardHref: string,
  ): string {
    const href = authenticated ? dashboardHref : signInHref;
    return `
      <div class="desktop-auth" role="group" aria-label="Account actions">
        <viking-button-wc
          variant="primary"
          class="auth-btn"
          href="${escapeHtml(href)}"
          id="auth-btn-desktop"
        >
          ${renderNavIcon(authenticated ? "home" : "arrow-right", 16, {
            id: "auth-icon-desktop",
          })}
          <span id="auth-text-desktop">${
            authenticated ? "Dashboard" : "Sign In"
          }</span>
        </viking-button-wc>
        <viking-button-wc
          variant="ghost"
          class="auth-btn auth-signout-btn"
          id="auth-signout-desktop"
          ${authenticated ? "" : " hidden"}
        >
          Sign Out
        </viking-button-wc>
      </div>
    `;
  }

  private renderAuthMobile(
    authenticated: boolean,
    dashboardHref: string,
    signInHref: string,
  ): string {
    return `
      <div class="mobile-divider"></div>
      <viking-button-wc
        variant="primary"
        full-width
        class="mobile-auth-btn auth-btn"
        href="${escapeHtml(authenticated ? dashboardHref : signInHref)}"
        id="auth-btn-mobile"
      >
        ${renderNavIcon(authenticated ? "home" : "arrow-right", 16, {
          id: "auth-icon-mobile",
        })}
        <span id="auth-text-mobile">${
          authenticated ? "Dashboard" : "Sign In"
        }</span>
      </viking-button-wc>
      <viking-button-wc
        variant="ghost"
        full-width
        class="mobile-auth-btn auth-btn auth-signout-btn"
        id="auth-signout-mobile"
        ${authenticated ? "" : " hidden"}
      >
        Sign Out
      </viking-button-wc>
    `;
  }

  private renderSearchButton(showSearch: boolean): string {
    if (!showSearch) {
      return "";
    }

    const shortcut = navigator.platform.match(/Mac|iPhone|iPad/i)
      ? "⌘K"
      : "Ctrl+K";
    return `
      <div class="navbar-search" role="search">
        <viking-button-wc
          variant="outline"
          square
          compact
          class="navbar-search-trigger"
          aria-label="Open search (${shortcut})"
          id="navbar-search-trigger"
        >
          ${renderNavIcon("search", 20)}
        </viking-button-wc>
      </div>
    `;
  }

  private render(): void {
    const context = readContext(this);
    const urls = readUrls(this);
    const authenticated = readAuthState(this);
    const showSearch = readShowSearch(this);
    const brandHref = resolveBrandHref(context, urls);
    const signInHref = readSignInHref(this, urls);
    const dashboardHref =
      this.getAttribute("dashboard-href") ?? `${urls.app}/dashboard`;
    const desktopNavLinks = this.renderNavLinks(context, urls, "desktop");
    const mobileNavLinks = this.renderNavLinks(context, urls, "mobile");
    const desktopAuth = this.renderAuthDesktop(
      authenticated,
      signInHref,
      dashboardHref,
    );
    const mobileAuth = this.renderAuthMobile(
      authenticated,
      dashboardHref,
      signInHref,
    );
    const search = this.renderSearchButton(showSearch);

    this.innerHTML = `
      <header class="navbar">
        <div class="navbar-content">
          <div class="navbar-left">
            <a href="${escapeHtml(brandHref)}" class="navbar-brand" aria-label="Go to homepage" id="navbar-brand-link">
              ${renderNavIcon("drakkar", 28, {
                color: "accent",
                className: "brand-icon navbar-logo",
              })}
            </a>
          </div>

          <nav class="navbar-center desktop-nav" aria-label="Main navigation">
            ${desktopNavLinks}
          </nav>

          <div class="navbar-right">
            ${search}
            ${desktopAuth}
            <viking-theme-toggle-wc class="theme-toggle-btn" aria-label="Toggle light and dark theme"></viking-theme-toggle-wc>
            <viking-button-wc
              variant="outline"
              square
              class="menu-toggle-btn"
              aria-label="Toggle navigation menu"
              aria-controls="mobile-menu"
              aria-expanded="false"
              id="mobile-menu-btn"
            >
              ${renderNavIcon("menu", 24)}
            </viking-button-wc>
          </div>
        </div>

        <nav class="mobile-menu" id="mobile-menu" aria-label="Mobile navigation" hidden>
          ${mobileNavLinks}
          ${mobileAuth}
        </nav>
      </header>
    `;
    this.syncMobileMenu();
  }

  private readonly onHostClick = (event: Event): void => {
    const path =
      typeof event.composedPath === "function" ? event.composedPath() : [];
    const clickedToggle = path.some(
      (node) => node instanceof HTMLElement && node.id === "mobile-menu-btn",
    );

    if (clickedToggle) {
      event.preventDefault();
      this.toggleMobileMenu();
      return;
    }

    const clickedMobileItem = path.some(
      (node) =>
        node instanceof HTMLElement &&
        node.closest?.("#mobile-menu") &&
        (node.matches("a") || node.matches("viking-button-wc")),
    );

    if (clickedMobileItem) {
      this.closeMobileMenu();
    }
  };

  private readonly onDocumentClick = (event: MouseEvent): void => {
    if (!this.mobileMenuOpen) {
      return;
    }
    const target = event.target;
    if (target instanceof Node && !this.contains(target)) {
      this.closeMobileMenu();
    }
  };

  private readonly onDocumentKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      this.closeMobileMenu();
    }
  };

  private readonly onWindowResize = (): void => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      this.closeMobileMenu();
    }
  };

  private toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    this.syncMobileMenu();
  }

  private closeMobileMenu(): void {
    if (!this.mobileMenuOpen) {
      return;
    }
    this.mobileMenuOpen = false;
    this.syncMobileMenu();
  }

  private syncMobileMenu(): void {
    const menu = this.querySelector<HTMLElement>("#mobile-menu");
    const toggle = this.querySelector<HTMLElement>("#mobile-menu-btn");
    if (!menu || !toggle) {
      return;
    }

    menu.classList.toggle("open", this.mobileMenuOpen);
    menu.toggleAttribute("hidden", !this.mobileMenuOpen);
    toggle.setAttribute(
      "aria-expanded",
      this.mobileMenuOpen ? "true" : "false",
    );
    toggle.setAttribute(
      "aria-label",
      this.mobileMenuOpen ? "Close navigation menu" : "Toggle navigation menu",
    );
    toggle.innerHTML = renderNavIcon(this.mobileMenuOpen ? "x" : "menu", 24);
  }
}

export const registerVikingSiteNavbarWc = (): void => {
  defineCustomElement(VikingSiteNavbarWc.tag, VikingSiteNavbarWc);
  defineCustomElementAlias(VikingSiteNavbarWc.legacyTag, VikingSiteNavbarWc);
};
