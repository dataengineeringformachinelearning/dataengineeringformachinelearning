/**
 * Viking-UI unified command palette — mounts viking-suite-command-palette on every surface.
 * Trigger: navbar search button or ⌘K / Ctrl+K.
 */
(() => {
  if (window.__DEML_COMMAND_PALETTE_READY__ === true) {
    return;
  }
  window.__DEML_COMMAND_PALETTE_READY__ = true;

  const PALETTE_ID = 'deml-suite-command-palette';
  const getFrontendUrl = () => {
    const config = window.__DEML || {};
    return config.FRONTEND_URL || 'https://deml.app';
  };

  const getMarketingUrl = () => {
    const config = window.__DEML || {};
    return config.MARKETING_URL || 'https://dataengineeringformachinelearning.com';
  };

  const ensureElements = () => {
    if (
      customElements.get('viking-suite-command-palette') ||
      customElements.get('viking-suite-search-palette-wc')
    ) {
      return;
    }
    window.VikingUI?.registerVikingElements?.();
  };

  const ensurePalette = () => {
    ensureElements();

    let palette = document.getElementById(PALETTE_ID);

    if (!palette) {
      palette = document.createElement('viking-suite-command-palette');
      palette.id = PALETTE_ID;
      palette.setAttribute('global-shortcut', 'false');
      palette.setAttribute('placeholder', 'Search documentation, dashboard, settings…');
      document.body.append(palette);
    } else {
      palette.removeAttribute('open');
    }

    return palette;
  };

  const openAlgoliaHostSearch = () => {
    const host = document.getElementById('autocomplete');
    if (!host) {
      return false;
    }
    host.classList.add('algolia-autocomplete-open');
    host.setAttribute('aria-hidden', 'false');
    return true;
  };

  const openSearch = () => {
    if (usesAlgoliaSearch && openAlgoliaHostSearch()) {
      return;
    }
    ensurePalette().openPalette?.();
  };

  const closeSearch = () => {
    const host = document.getElementById('autocomplete');
    if (usesAlgoliaSearch && host) {
      host.classList.remove('algolia-autocomplete-open');
      host.setAttribute('aria-hidden', 'true');
      return;
    }
    document.getElementById(PALETTE_ID)?.closePalette?.();
  };

  const existingOpenBugReport = typeof window.DemlWidgets?.openBugReport === 'function' ? window.DemlWidgets?.openBugReport : null;
  const existingOpenBugReporter = typeof window.DemlWidgets?.openBugReporter === 'function' ? window.DemlWidgets?.openBugReporter : null;
  const existingOpenCookieSettings = typeof window.DemlWidgets?.openCookieSettings === 'function' ? window.DemlWidgets?.openCookieSettings : null;
  const usesAlgoliaSearch = window.__DEML?.USE_ALGOLIA_SEARCH === true;
  const hasSearchHandlers =
    usesAlgoliaSearch ||
    typeof window.DemlWidgets?.openSearch === 'function' ||
    typeof window.DemlWidgets?.closeSearch === 'function';
  const shouldBindShortcuts = !hasSearchHandlers;
  const shouldBindClose = !hasSearchHandlers;

  const openBugReport = () => {
    if (existingOpenBugReport && existingOpenBugReport !== openBugReport) {
      existingOpenBugReport();
      return;
    }

    if (existingOpenBugReporter && existingOpenBugReporter !== openBugReport) {
      existingOpenBugReporter();
      return;
    }

    window.dispatchEvent(new CustomEvent('openBugReporter'));
    window.location.assign(`${getFrontendUrl()}/?reportBug=1`);
  };

  const openCookieSettings = () => {
    if (existingOpenCookieSettings && existingOpenCookieSettings !== openCookieSettings) {
      existingOpenCookieSettings();
      return;
    }
    window.location.assign(`${getMarketingUrl()}/?cookieSettings=1`);
  };

  window.DemlWidgets = window.DemlWidgets || {};
  if (shouldBindShortcuts) {
    window.DemlWidgets.openSearch = openSearch;
  }
  if (shouldBindClose) {
    window.DemlWidgets.closeSearch = closeSearch;
  }
  if (!hasSearchHandlers) {
    window.DemlWidgets.openSearch = openSearch;
    window.DemlWidgets.closeSearch = closeSearch;
  }
  window.DemlWidgets.openBugReport = openBugReport;
  window.DemlWidgets.openBugReporter = openBugReport;
  window.DemlWidgets.openCookieSettings = openCookieSettings;

  if (shouldBindShortcuts) {
    document.addEventListener('keydown', event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (window.DemlWidgets?.openSearch) {
          window.DemlWidgets.openSearch();
          return;
        }
        openSearch();
      }

      if (event.key === 'Escape') {
        if (window.DemlWidgets?.closeSearch) {
          window.DemlWidgets.closeSearch();
          return;
        }
        closeSearch();
      }
    });
  }
})();
