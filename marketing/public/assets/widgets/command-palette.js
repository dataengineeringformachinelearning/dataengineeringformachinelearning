/**
 * Viking-UI unified command palette — mounts viking-suite-command-palette on every surface.
 * Live Algolia multi-index results merge into the palette as you type (see suite-search-palette-wc).
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
    return config.FRONTEND_URL || config.app || 'https://deml.app';
  };

  const getMarketingUrl = () => {
    const config = window.__DEML || {};
    return (
      config.MARKETING_URL || config.marketing || 'https://dataengineeringformachinelearning.com'
    );
  };

  const getBackendUrl = () => {
    const config = window.__DEML || {};
    return config.BACKEND_URL || config.backend || 'https://backend.deml.app';
  };

  const detectContext = () => {
    const explicit = document.documentElement.getAttribute('data-deml-context');
    if (explicit && ['app', 'marketing', 'backend', 'docs'].includes(explicit)) {
      return explicit;
    }
    const host = window.location.hostname;
    if (host.startsWith('ui.')) return 'docs';
    if (host.startsWith('backend.')) return 'backend';
    if (host.includes('deml.app')) return 'app';
    return 'marketing';
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
      // Suite palette owns ⌘K when this widget is the search host.
      palette.setAttribute('global-shortcut', '');
      palette.setAttribute('placeholder', 'Search pages, docs, dashboard, API…');
      palette.setAttribute('context', detectContext());
      palette.setAttribute('app-url', getFrontendUrl());
      palette.setAttribute('marketing-url', getMarketingUrl());
      palette.setAttribute('backend-url', getBackendUrl());
      palette.toggleAttribute(
        'authenticated',
        document.documentElement.dataset.authenticated === 'true',
      );
      document.body.append(palette);
    }

    return palette;
  };

  /** Always open the suite palette (curated + live Algolia hits, clickable hrefs). */
  const openSearch = () => {
    const palette = ensurePalette();
    if (typeof palette.openPalette === 'function') {
      palette.openPalette();
      return;
    }
    // Custom element may still be upgrading.
    customElements.whenDefined('viking-suite-command-palette').then(() => {
      ensurePalette().openPalette?.();
    });
  };

  const closeSearch = () => {
    const palette = document.getElementById(PALETTE_ID);
    if (palette && typeof palette.closePalette === 'function') {
      palette.closePalette();
    }
    // Close legacy Experiences host if present.
    const host = document.getElementById('autocomplete');
    if (host) {
      host.classList.remove('algolia-autocomplete-open');
      host.setAttribute('aria-hidden', 'true');
    }
  };

  const existingOpenBugReport =
    typeof window.DemlWidgets?.openBugReport === 'function'
      ? window.DemlWidgets.openBugReport
      : null;
  const existingOpenBugReporter =
    typeof window.DemlWidgets?.openBugReporter === 'function'
      ? window.DemlWidgets.openBugReporter
      : null;
  const existingOpenCookieSettings =
    typeof window.DemlWidgets?.openCookieSettings === 'function'
      ? window.DemlWidgets.openCookieSettings
      : null;

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
  // Always expose suite palette open/close (overrides empty Experiences-only bridge).
  window.DemlWidgets.openSearch = openSearch;
  window.DemlWidgets.closeSearch = closeSearch;
  window.DemlWidgets.openBugReport = openBugReport;
  window.DemlWidgets.openBugReporter = openBugReport;
  window.DemlWidgets.openCookieSettings = openCookieSettings;

  window.addEventListener('deml:auth-state', event => {
    const palette = document.getElementById(PALETTE_ID);
    palette?.toggleAttribute('authenticated', event.detail?.isAuthenticated === true);
  });

  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      const palette = document.getElementById(PALETTE_ID);
      const isOpen =
        palette?.hasAttribute('open') || palette?.querySelector?.('viking-command-palette[open]');
      if (isOpen) {
        closeSearch();
      } else {
        openSearch();
      }
    }
  });
})();
