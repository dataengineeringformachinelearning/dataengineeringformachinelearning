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
import { parseNumber, parseSelect } from "../core/parsers";
import { VikingReactiveElement } from "../core/reactive";

const VALID_CONTEXTS = ["app", "marketing", "backend", "docs"] as const;

type FooterContext = (typeof VALID_CONTEXTS)[number];

const detectContext = (): FooterContext => {
  if (typeof document === "undefined") {
    return "marketing";
  }
  const explicit = document.documentElement.getAttribute("data-deml-context");
  if (explicit && (VALID_CONTEXTS as readonly string[]).includes(explicit)) {
    return explicit as FooterContext;
  }

  if (typeof window === "undefined") {
    return "marketing";
  }
  const host = window.location.hostname;
  if (host.startsWith("backend.")) {
    return "backend";
  }
  if (
    host.startsWith("ui.") ||
    host.includes("ui.dataengineeringformachinelearning")
  ) {
    return "docs";
  }
  if (host.includes("deml.app")) {
    return "app";
  }
  return "marketing";
};

type FooterProps = {
  context: SiteDrakkarContext;
  urls: SiteUrls;
  year: number;
};

/**
 * viking-site-footer-wc — unified static Drakkar footer for non-Angular surfaces.
 * Extends {@link VikingReactiveElement} so multi-attr updates batch into one paint.
 */
export class VikingSiteFooterWc extends VikingReactiveElement<FooterProps> {
  static readonly tag = "viking-site-footer";
  static readonly legacyTag = "viking-site-footer-wc";

  static get observedAttributes(): string[] {
    return [
      "context",
      "app-url",
      "marketing-url",
      "backend-url",
      "year",
      "authenticated",
    ];
  }

  private readonly onAuthState = (event: Event): void => {
    const detail = (event as CustomEvent<{ isAuthenticated?: boolean }>).detail;
    this.toggleAttribute("authenticated", detail?.isAuthenticated === true);
  };

  override connectedCallback(): void {
    window.addEventListener("deml:auth-state", this.onAuthState);
    if (document.documentElement.dataset["authenticated"] === "true") {
      this.setAttribute("authenticated", "");
    }
    super.connectedCallback();
  }

  disconnectedCallback(): void {
    window.removeEventListener("deml:auth-state", this.onAuthState);
  }

  private resolveContext(): SiteDrakkarContext {
    return this.attr("context", {
      parser: (raw) =>
        parseSelect(raw, VALID_CONTEXTS, detectContext()) as SiteDrakkarContext,
      default: detectContext() as SiteDrakkarContext,
    });
  }

  private resolveUrls(): SiteUrls {
    const env =
      (globalThis as { __DEML?: Partial<SiteUrls> & Record<string, string> })
        .__DEML ?? {};
    return {
      app: this.getAttribute("app-url") ?? env.app ?? DEFAULT_SITE_URLS.app,
      marketing:
        this.getAttribute("marketing-url") ??
        env.marketing ??
        DEFAULT_SITE_URLS.marketing,
      backend:
        this.getAttribute("backend-url") ??
        env.backend ??
        DEFAULT_SITE_URLS.backend,
    };
  }

  private resolveYear(): number {
    return this.attr("year", {
      parser: (raw) => parseNumber(raw, new Date().getFullYear()),
      default: new Date().getFullYear(),
    });
  }

  protected render(): void {
    // Attributes are source of truth — do not setProp() here (object refs re-queue renders).
    const context = this.resolveContext();
    const urls = this.resolveUrls();
    const year = this.resolveYear();
    const authenticated = this.hasAttribute("authenticated");

    const links = SITE_FOOTER_COLUMNS.map((column) => {
      const items = column.links
        .filter((link) => !link.requireAuth || authenticated)
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
        <h2 class="footer-column-title">${escapeHtml(column.title)}</h2>
        <ul class="footer-list">
          ${items}
        </ul>
      </div>
    `;
    }).join("");

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

registerVikingSiteFooterWc();
