import {
  DEFAULT_SITE_URLS,
  type SiteDrakkarContext,
  type SiteUrls,
} from "../../lib/site-drakkar/site-drakkar.config";
import { buildSuiteSearchItems } from "../../lib/site-drakkar/suite-search-items";
import { searchAlgoliaPages } from "../core/algolia-search";
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

const readAuthenticated = (el: HTMLElement): boolean =>
  el.hasAttribute("authenticated") ||
  document.documentElement.dataset["authenticated"] === "true";

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
 * @attr authenticated - Include account-only navigation entries
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
      "authenticated",
    ];
  }

  private paletteEl: VikingSearchPaletteWc | null = null;
  private itemsLoaded = false;
  private curatedItems: VikingSearchPaletteItem[] = [];
  private queryTimer: ReturnType<typeof setTimeout> | null = null;
  private searchAbort: AbortController | null = null;
  private readonly onAuthState = (event: Event): void => {
    const detail = (event as CustomEvent<{ isAuthenticated?: boolean }>).detail;
    this.toggleAttribute("authenticated", detail?.isAuthenticated === true);
  };
  private readonly onPaletteQuery = (event: Event): void => {
    const detail = (event as CustomEvent<{ query?: string }>).detail;
    const query = detail?.query ?? "";
    this.scheduleAlgoliaSearch(query);
  };

  connectedCallback(): void {
    registerVikingSearchPaletteWc();
    window.addEventListener("deml:auth-state", this.onAuthState);
    this.ensurePalette();
    void this.loadItems();
  }

  disconnectedCallback(): void {
    window.removeEventListener("deml:auth-state", this.onAuthState);
    this.paletteEl?.removeEventListener("viking-query", this.onPaletteQuery);
    if (this.queryTimer) {
      clearTimeout(this.queryTimer);
      this.queryTimer = null;
    }
    this.searchAbort?.abort();
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
      name === "backend-url" ||
      name === "authenticated"
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

    this.paletteEl.addEventListener("viking-query", this.onPaletteQuery);
    this.append(this.paletteEl);
  }

  private scheduleAlgoliaSearch(query: string): void {
    if (this.queryTimer) {
      clearTimeout(this.queryTimer);
    }
    this.queryTimer = setTimeout(() => {
      void this.mergeAlgoliaResults(query);
    }, 180);
  }

  private async mergeAlgoliaResults(query: string): Promise<void> {
    if (!this.paletteEl) {
      return;
    }
    if (!this.itemsLoaded) {
      await this.loadItems();
    }

    const q = query.trim();
    if (q.length < 2) {
      this.paletteEl.setAttribute("items", JSON.stringify(this.curatedItems));
      return;
    }

    this.searchAbort?.abort();
    this.searchAbort = new AbortController();

    const remote = await searchAlgoliaPages(q, {
      hitsPerPage: 6,
      signal: this.searchAbort.signal,
    });

    const curatedMatches = this.curatedItems;
    const seen = new Set(
      curatedMatches.map((item) => item.href.replace(/\/$/, "")),
    );
    const remoteOnly = remote
      .filter((item) => {
        const key = item.href.replace(/\/$/, "");
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .map((item) => ({
        ...item,
        // Ensure local substring filter keeps Algolia fuzzy hits visible.
        keywords: [...(item.keywords ?? []), q, item.title, item.href],
      })) as VikingSearchPaletteItem[];

    this.paletteEl.setAttribute(
      "items",
      JSON.stringify([...curatedMatches, ...remoteOnly]),
    );
  }

  private async loadItems(force = false): Promise<void> {
    if (!this.paletteEl || (this.itemsLoaded && !force)) {
      return;
    }

    const context = readContext(this);
    const urls = readUrls(this);
    const docsOrigin =
      context === "docs"
        ? window.location.origin
        : "https://ui.dataengineeringformachinelearning.com";
    let items: VikingSearchPaletteItem[] = buildSuiteSearchItems(
      context,
      urls,
      {
        docsOrigin,
        authenticated: readAuthenticated(this),
      },
    );

    try {
      const response = await fetch("/assets/site-drakkar.json", {
        cache: "no-cache",
      });
      if (response.ok) {
        // Config presence validates CDN path; curated builder remains SSoT.
        items = buildSuiteSearchItems(context, urls, {
          docsOrigin,
          authenticated: readAuthenticated(this),
        });
      }
    } catch {
      // Bundled config is authoritative when JSON is unavailable.
    }

    this.curatedItems = items;
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
