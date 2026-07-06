import {
  SiteDrakkarContext,
  SiteFooterLink,
  SiteUrls,
  SITE_FOOTER_COLUMNS,
  DEFAULT_SITE_URLS,
  resolveFooterHref,
} from "../../lib/site-drakkar/site-drakkar.config";
import {
  defineCustomElement,
  defineCustomElementAlias,
  escapeHtml,
} from "../core/dom";

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

const readYear = (el: HTMLElement): number => {
  const raw = el.getAttribute("year");
  const value = raw ? Number(raw) : new Date().getFullYear();
  return Number.isFinite(value) ? value : new Date().getFullYear();
};

const renderFooterLinks = (
  context: SiteDrakkarContext,
  urls: SiteUrls,
): string => {
  return SITE_FOOTER_COLUMNS.map((column) => {
    const links = column.links
      .map((link: SiteFooterLink) => {
        const href = resolveFooterHref(link, context, urls);
        return `
          <li>
            <a href="${escapeHtml(href)}">${escapeHtml(link.label)}</a>
          </li>
        `;
      })
      .join("");

    return `
      <div class="footer-column">
        <h3 class="footer-column-title">${escapeHtml(column.title)}</h3>
        <ul class="footer-list">
          ${links}
        </ul>
      </div>
    `;
  }).join("");
};

/**
 * viking-site-footer-wc — unified static Drakkar footer for non-Angular surfaces.
 */
export class VikingSiteFooterWc extends HTMLElement {
  static readonly tag = "viking-site-footer";
  static readonly legacyTag = "viking-site-footer-wc";

  static get observedAttributes(): string[] {
    return ["context", "app-url", "marketing-url", "backend-url", "year"];
  }

  connectedCallback(): void {
    this.render();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.render();
    }
  }

  private render(): void {
    const context = readContext(this);
    const urls = readUrls(this);
    const year = readYear(this);
    const links = renderFooterLinks(context, urls);

    this.innerHTML = `
      <footer class="mega-footer">
        <div class="footer-content">
          <nav class="footer-directory" aria-label="Footer Directory">
            ${links}
          </nav>

          <section class="footer-bottom">
            <div class="footer-badges-top">
              <span
                class="usa-badge"
                id="usa-badge"
                role="button"
                tabindex="0"
                aria-label="Made in the U.S.A."
              >
                <span class="usa-badge-icon" aria-hidden="true">🇺🇸</span>
                <span>Made in the U.S.A</span>
              </span>
            </div>

            <div class="footer-compliance-row">
              <div class="copyright-info">
                <span class="copyright-text">
                  Copyright © ${year} Data Engineering for Machine Learning by
                  <a href="https://joealongi.dev/" target="_blank" rel="noopener noreferrer">Joe Alongi</a>.
                  All rights reserved.
                </span>
              </div>
            </div>
          </section>
        </div>
      </footer>
    `;
  }
}

export const registerVikingSiteFooterWc = (): void => {
  defineCustomElement(VikingSiteFooterWc.tag, VikingSiteFooterWc);
  defineCustomElementAlias(VikingSiteFooterWc.legacyTag, VikingSiteFooterWc);
};
