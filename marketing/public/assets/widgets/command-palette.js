/**
 * Viking-UI unified command palette — mounts viking-suite-search-palette-wc on every surface.
 * Trigger: navbar search button or ⌘K / Ctrl+K.
 */
(() => {
  const PALETTE_ID = 'deml-suite-command-palette';

  const ensureElements = () => {
    if (customElements.get('viking-suite-search-palette-wc')) {
      return;
    }
    window.VikingUI?.registerVikingElements?.();
  };

  const ensurePalette = () => {
    ensureElements();

    let palette = document.getElementById(PALETTE_ID);

    if (!palette) {
      palette = document.createElement('viking-suite-search-palette-wc');
      palette.id = PALETTE_ID;
      palette.setAttribute('global-shortcut', '');
      palette.setAttribute('placeholder', 'Search documentation, dashboard, settings…');
      document.body.append(palette);
    }

    return palette;
  };

  const openSearch = () => {
    ensurePalette().openPalette?.();
  };

  const closeSearch = () => {
    document.getElementById(PALETTE_ID)?.closePalette?.();
  };

  window.DemlWidgets = window.DemlWidgets || {};
  window.DemlWidgets.openSearch = openSearch;
  window.DemlWidgets.closeSearch = closeSearch;

  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openSearch();
      return;
    }

    if (event.key === 'Escape') {
      closeSearch();
    }
  });
})();
