import {
  DEFAULT_SITE_URLS,
  type SiteDrakkarContext,
  type SiteUrls,
} from "../../lib/site-drakkar/site-drakkar.config";
import { buildSuiteSearchItems } from "../../lib/site-drakkar/suite-search-items";
import { readBoolAttr } from "../core/base";
import {
  defineCustomElement,
  defineCustomElementAlias,
  HTMLElementBase,
} from "../core/dom";
import {
  VikingSearchPaletteWc,
  registerVikingSearchPaletteWc,
  type VikingSearchPaletteItem,
} from "../search-palette/viking-search-palette-wc";

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
  if (host.includes("deml.app") && !host.startsWith("backend.")) {
    return "app";
  }
  if (host.startsWith("backend.")) {
    return "backend";
  }
  return "marketing";
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

const readContext = (el: HTMLElement): SiteDrakkarContext => {
  const raw = el.getAttribute("context");
  if (raw && VALID_CONTEXTS.has(raw as SiteDrakkarContext)) {
    return raw as SiteDrakkarContext;
  }
  return detectContext();
};

/**
 * Unified cross-suite command palette Web Component.
 * Tag: `viking-suite-command-palette`
 * Aliases: `viking-suite-search-palette`, `viking-suite-search-palette-wc`
 *
 * Curated ⌘K navigation for marketing, docs, deml.app, and backend surfaces.
 * Composes `viking-command-palette` with suite links from site-drakkar config.
 *
 * @attr context - Surface: app | marketing | backend | docs (auto-detected when omitted)
 * @attr app-url - Override deml.app origin
 * @attr marketing-url - Override marketing origin
 * @attr backend-url - Override backend origin
 * @attr global-shortcut - Bind ⌘K / Ctrl+K (default: on)
 * @attr placeholder - Search input placeholder
 *
 * @method openPalette() - Programmatically open
 * @method closePalette() - Programmatically close
 *
 * @example
 * <viking-suite-command-palette context="marketing" global-shortcut></viking-suite-command-palette>
 */
export class VikingSuiteSearchPaletteWc extends HTMLElementBase {
  static readonly tag = "viking-suite-command-palette";
  static readonly searchTag = "viking-suite-search-palette";
  static readonly legacyTag = "viking-suite-search-palette-wc";

  static get observedAttributes(): string[] {
    return [
      "context",
      "app-url",
      "marketing-url",
      "backend-url",
      "placeholder",
      "global-shortcut",
    ];
  }

  private paletteEl: VikingSearchPaletteWc | null = null;
  private itemsLoaded = false;

  connectedCallback(): void {
    registerVikingSearchPaletteWc();
    this.ensurePalette();
    void this.loadItems();
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) {
      return;
    }
    if (name === "placeholder" && this.paletteEl) {
      const placeholder =
        this.getAttribute("placeholder") ??
        "Search documentation, dashboard, settings…";
      this.paletteEl.setAttribute("placeholder", placeholder);
      return;
    }
    if (name === "global-shortcut" && this.paletteEl) {
      if (
        readBoolAttr(this, "global-shortcut") ||
        !this.hasAttribute("global-shortcut")
      ) {
        this.paletteEl.setAttribute("global-shortcut", "");
      } else {
        this.paletteEl.removeAttribute("global-shortcut");
      }
      return;
    }
    if (
      name === "context" ||
      name === "app-url" ||
      name === "marketing-url" ||
      name === "backend-url"
    ) {
      void this.loadItems(true);
    }
  }

  /** Opens the unified command palette. */
  openPalette(): void {
    this.ensurePalette();
    void this.loadItems().then(() => this.paletteEl?.openPalette());
  }

  /** Closes the unified command palette. */
  closePalette(): void {
    this.paletteEl?.closePalette();
  }

  private ensurePalette(): void {
    if (this.paletteEl) {
      return;
    }

    this.paletteEl = document.createElement(
      "viking-command-palette",
    ) as VikingSearchPaletteWc;
    this.paletteEl.id = "deml-command-palette";

    const placeholder =
      this.getAttribute("placeholder") ??
      "Search documentation, dashboard, settings…";
    this.paletteEl.setAttribute("placeholder", placeholder);

    if (
      readBoolAttr(this, "global-shortcut") ||
      !this.hasAttribute("global-shortcut")
    ) {
      this.paletteEl.setAttribute("global-shortcut", "");
    }

    this.append(this.paletteEl);
  }

  private async loadItems(force = false): Promise<void> {
    if (!this.paletteEl || (this.itemsLoaded && !force)) {
      return;
    }

    const context = readContext(this);
    const urls = readUrls(this);
    let items: VikingSearchPaletteItem[] = buildSuiteSearchItems(
      context,
      urls,
      {
        docsOrigin: window.location.origin,
      },
    );

    try {
      const response = await fetch("/assets/site-drakkar.json", {
        cache: "no-cache",
      });
      if (response.ok) {
        const drakkar = (await response.json()) as {
          navLinks?: unknown[];
          footerColumns?: unknown[];
        };
        if (drakkar.navLinks?.length || drakkar.footerColumns?.length) {
          items = buildSuiteSearchItems(context, urls, {
            docsOrigin: window.location.origin,
          });
        }
      }
    } catch {
      // Bundled config is authoritative when JSON is unavailable.
    }

    this.paletteEl.setAttribute("items", JSON.stringify(items));
    this.itemsLoaded = true;
  }
}

export const registerVikingSuiteSearchPaletteWc = (): void => {
  defineCustomElement(
    VikingSuiteSearchPaletteWc.tag,
    VikingSuiteSearchPaletteWc,
  );
  defineCustomElementAlias(
    VikingSuiteSearchPaletteWc.searchTag,
    VikingSuiteSearchPaletteWc,
  );
  defineCustomElementAlias(
    VikingSuiteSearchPaletteWc.legacyTag,
    VikingSuiteSearchPaletteWc,
  );
};
