/**
 * Bridge for Algolia Experiences autocomplete (#autocomplete).
 * Opens in a modal on all breakpoints (navbar button or Cmd/Ctrl+K).
 * Ensures result rows navigate to the indexed page URL (Experiences templates
 * often omit <a href> wrappers).
 */
(() => {
  if (window.__DEML_ALGOLIA_SEARCH_READY__ === true) {
    return;
  }
  window.__DEML_ALGOLIA_SEARCH_READY__ = true;

  const DEFAULT_INDEXES = [
    "dataengineeringformachinelearning_com_zjafyosh2v_pages",
    "deml_app_pages",
    "deml_backend_pages",
    "DEML UI",
  ];

  const INDEX_ORIGIN = {
    dataengineeringformachinelearning_com_zjafyosh2v_pages:
      "https://dataengineeringformachinelearning.com",
    deml_app_pages: "https://deml.app",
    deml_backend_pages: "https://backend.deml.app",
    "DEML UI": "https://ui.dataengineeringformachinelearning.com",
  };

  const loadAlgoliaExperiences = () => {
    if (document.querySelector("script[data-deml-algolia-experiences]")) {
      return;
    }
    const cfg = window.ALGOLIA_CONFIG || {};
    const appId = cfg.appId || "ZJAFYOSH2V";
    const apiKey = cfg.apiKey || ""; // pragma: allowlist secret
    const experienceId = cfg.experienceId || appId;
    const env = cfg.env || "prod";
    if (!apiKey) {
      return;
    }
    const url = new URL("https://cdn.jsdelivr.net/npm/@algolia/experiences/dist/experiences.js");
    url.searchParams.set("appId", appId);
    url.searchParams.set("apiKey", apiKey);
    url.searchParams.set("experienceId", experienceId);
    url.searchParams.set("env", env);
    const script = document.createElement("script");
    script.src = url.toString();
    script.defer = true;
    script.setAttribute("data-deml-algolia-experiences", "true");
    document.head.appendChild(script);
  };

  const getDetachedSearchPanel = () => document.querySelector(".aa-DetachedContainer");

  const getSearchPanel = host =>
    host?.querySelector(".aa-Panel, .aa-Autocomplete, .aa-DetachedContainer, .aa-Form, form") ??
    getDetachedSearchPanel();

  const getSearchInput = host =>
    host?.querySelector("input, textarea, [contenteditable='true']") ??
    getDetachedSearchPanel()?.querySelector("input, textarea, [contenteditable='true']") ??
    null;

  const isSearchTarget = target => {
    if (!target) return false;
    const host = document.getElementById("autocomplete");
    if (!host) return false;
    const panel = getSearchPanel(host);
    const detached = getDetachedSearchPanel();
    return (
      host.contains(target) ||
      (panel && panel.contains(target)) ||
      (detached && detached.contains(target)) ||
      Boolean(target.closest?.(".ais-Autocomplete, .aa-Panel, .aa-DetachedContainer"))
    );
  };

  const setSearchActive = active => {
    const root = document.querySelector(".navbar-search");
    if (root) root.classList.toggle("algolia-search-active", active);
    document.body.classList.toggle("algolia-search-open", active);
  };

  const focusAlgoliaSearch = () => {
    const host = document.getElementById("autocomplete");
    if (!host) return;
    loadAlgoliaExperiences();
    host.classList.add("algolia-autocomplete-open");
    host.setAttribute("aria-hidden", "false");
    setSearchActive(true);
    const focusInput = () => {
      const input = getSearchInput(host);
      if (input && typeof input.focus === "function") {
        input.focus();
        if (typeof input.select === "function") input.select();
        return true;
      }
      return false;
    };
    if (!focusInput()) {
      window.setTimeout(focusInput, 100);
      window.setTimeout(focusInput, 350);
    }
  };

  const closeSearch = () => {
    const host = document.getElementById("autocomplete");
    if (!host) return;
    host.classList.remove("algolia-autocomplete-open");
    host.setAttribute("aria-hidden", "true");
    setSearchActive(false);
  };

  const asHttpUrl = value => {
    if (typeof value !== "string") return null;
    const v = value.trim();
    if (!v) return null;
    if (/^https?:\/\//i.test(v)) return v;
    if (v.startsWith("/") && typeof window !== "undefined") {
      try {
        return new URL(v, window.location.origin).href;
      } catch {
        return null;
      }
    }
    return null;
  };

  const hitUrl = (hit, indexName) => {
    if (!hit || typeof hit !== "object") return null;
    const direct =
      asHttpUrl(hit.url) ||
      asHttpUrl(hit.url_without_anchor) ||
      asHttpUrl(hit.permalink) ||
      asHttpUrl(hit.link) ||
      asHttpUrl(hit.objectID);
    if (direct) return direct;

    const path = typeof hit.path === "string" ? hit.path.trim() : "";
    if (path) {
      const origin =
        INDEX_ORIGIN[indexName] ||
        (typeof hit.hostname === "string" && hit.hostname
          ? `https://${hit.hostname.replace(/^https?:\/\//, "")}`
          : null);
      if (origin) {
        try {
          return new URL(path.startsWith("/") ? path : `/${path}`, origin).href;
        } catch {
          /* ignore */
        }
      }
    }
    return null;
  };

  /** Resolve a destination URL for an Experiences result row. */
  const resolveUrlForItem = async itemEl => {
    const existing = itemEl.querySelector?.("a[href]");
    const fromAnchor = asHttpUrl(existing?.getAttribute("href") || existing?.href);
    if (fromAnchor) return fromAnchor;

    for (const attr of ["data-url", "data-href", "data-objectid", "data-object-id"]) {
      const node = itemEl.closest?.(`[${attr}]`) || itemEl.querySelector?.(`[${attr}]`);
      const val = node?.getAttribute?.(attr);
      const url = asHttpUrl(val);
      if (url) return url;
    }

    const title =
      itemEl.querySelector?.(".ais-ItemTemplateTitle, .aa-ItemTitle, [class*='Title']")
        ?.textContent?.trim() || "";
    if (!title || title.length < 2) return null;

    const cfg = window.ALGOLIA_CONFIG || {};
    const appId = cfg.appId || "ZJAFYOSH2V";
    const apiKey = cfg.apiKey || ""; // pragma: allowlist secret
    if (!apiKey) return null;

    const indexes =
      Array.isArray(cfg.indexNames) && cfg.indexNames.length > 0
        ? cfg.indexNames
        : DEFAULT_INDEXES;

    try {
      const response = await fetch(`https://${appId}-dsn.algolia.net/1/indexes/*/queries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Algolia-Application-Id": appId,
          "X-Algolia-API-Key": apiKey,
        },
        body: JSON.stringify({
          requests: indexes.map(indexName => ({
            indexName,
            params: new URLSearchParams({
              query: title,
              hitsPerPage: "3",
              attributesToRetrieve: [
                "url",
                "url_without_anchor",
                "title",
                "path",
                "hostname",
                "objectID",
              ].join(","),
            }).toString(),
          })),
        }),
      });
      if (!response.ok) return null;
      const payload = await response.json();
      const titleLower = title.toLowerCase();
      for (const [i, result] of (payload.results || []).entries()) {
        const indexName = result.index || indexes[i] || "";
        for (const hit of result.hits || []) {
          const hitTitle = String(hit.title || "").toLowerCase();
          if (hitTitle && hitTitle !== titleLower && !hitTitle.includes(titleLower.slice(0, 24))) {
            // Prefer exact/near title match when possible; still allow first hit below.
            continue;
          }
          const url = hitUrl(hit, indexName);
          if (url) return url;
        }
        // Fall back to first hit with a URL in this index
        for (const hit of result.hits || []) {
          const url = hitUrl(hit, indexName);
          if (url) return url;
        }
      }
    } catch {
      return null;
    }
    return null;
  };

  const navigateTo = url => {
    if (!url) return;
    closeSearch();
    // Same-origin keep SPA path; external full navigation.
    try {
      const dest = new URL(url, window.location.href);
      if (dest.origin === window.location.origin) {
        window.location.assign(dest.pathname + dest.search + dest.hash);
      } else {
        window.location.assign(dest.href);
      }
    } catch {
      window.location.href = url;
    }
  };

  const itemSelector =
    ".ais-AutocompleteIndexItem, .ais-ItemTemplate, .aa-Item, [class*='AutocompleteIndexItem']";

  document.addEventListener(
    "click",
    event => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const item = target.closest(itemSelector);
      if (!item || !isSearchTarget(item)) return;

      // Allow modifier-clicks on real anchors to keep browser defaults.
      const anchor = target.closest("a[href]");
      if (anchor && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      void resolveUrlForItem(item).then(url => {
        if (url) {
          navigateTo(url);
          return;
        }
        // Last resort: if Experiences rendered a plain anchor somewhere deeper
        const fallback = item.querySelector("a[href]");
        if (fallback?.href) navigateTo(fallback.href);
      });
    },
    true,
  );

  document.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    const host = document.getElementById("autocomplete");
    if (!host?.classList.contains("algolia-autocomplete-open")) return;
    const selected =
      document.querySelector(
        `${itemSelector}[aria-selected="true"], ${itemSelector}.aa-Item[aria-selected="true"]`,
      ) || document.querySelector(`${itemSelector}[aria-selected="true"]`);
    if (!selected) return;
    event.preventDefault();
    void resolveUrlForItem(selected).then(url => {
      if (url) navigateTo(url);
    });
  });

  // Pointer affordance: Experiences templates often lack link styling.
  const styleResults = () => {
    document.querySelectorAll(itemSelector).forEach(el => {
      if (el instanceof HTMLElement) {
        el.style.cursor = "pointer";
      }
    });
  };
  const resultsObserver = new MutationObserver(() => styleResults());
  const observeResults = () => {
    const root = document.body;
    if (!root) return;
    resultsObserver.observe(root, { childList: true, subtree: true });
  };

  const mountAlgoliaWhenReady = () => {
    const host = document.getElementById("autocomplete");
    if (!host) {
      return false;
    }
    loadAlgoliaExperiences();
    return true;
  };

  const watchForAutocompleteHost = () => {
    if (mountAlgoliaWhenReady()) {
      return;
    }

    const observer = new MutationObserver(() => {
      if (mountAlgoliaWhenReady()) {
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    window.setTimeout(() => {
      observer.disconnect();
      mountAlgoliaWhenReady();
    }, 15000);
  };

  document.addEventListener("pointerdown", event => {
    const host = document.getElementById("autocomplete");
    if (!host?.classList.contains("algolia-autocomplete-open")) return;
    if (isSearchTarget(event.target)) return;
    closeSearch();
  });

  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    const host = document.getElementById("autocomplete");
    if (!host?.classList.contains("algolia-autocomplete-open")) return;
    event.preventDefault();
    closeSearch();
  });

  window.DemlWidgets = window.DemlWidgets || {};
  // Prefer the suite command palette (curated + Algolia hits with real hrefs).
  // Experiences templates often omit <a href>; only own openSearch when suite is absent.
  const suiteOwnsSearch = () =>
    window.__DEML_COMMAND_PALETTE_READY__ === true ||
    Boolean(document.getElementById("deml-suite-command-palette"));

  if (!suiteOwnsSearch()) {
    window.DemlWidgets.openSearch = focusAlgoliaSearch;
    window.DemlWidgets.closeSearch = closeSearch;
  } else {
    // Expose Experiences helpers without stealing the primary search entrypoint.
    window.DemlWidgets.openAlgoliaExperiences = focusAlgoliaSearch;
    window.DemlWidgets.closeAlgoliaExperiences = closeSearch;
  }

  window.addEventListener("keydown", event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      // Suite palette registers its own ⌘K handler when present.
      if (suiteOwnsSearch()) {
        return;
      }
      event.preventDefault();
      const host = document.getElementById("autocomplete");
      if (host?.classList.contains("algolia-autocomplete-open")) {
        closeSearch();
        return;
      }
      focusAlgoliaSearch();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      watchForAutocompleteHost();
      observeResults();
    });
  } else {
    watchForAutocompleteHost();
    observeResults();
  }
})();
