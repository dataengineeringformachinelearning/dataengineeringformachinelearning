/**
 * Viking-UI unified command palette — mounts viking-suite-search-palette-wc on every surface.
 * Trigger: navbar search button or ⌘K / Ctrl+K.
 */
(() => {
  const PALETTE_ID = 'deml-command-palette';

  const ensureElements = (): void => {
    if (customElements.get('viking-suite-search-palette-wc')) {
      return;
    }
    window.VikingUI?.registerVikingElements?.();
  };

  const ensurePalette = (): HTMLElement & {
    openPalette?: () => void;
    closePalette?: () => void;
  } => {
    ensureElements();

    let palette = document.getElementById(PALETTE_ID) as HTMLElement & {
      openPalette?: () => void;
      closePalette?: () => void;
    };

    if (!palette) {
      palette = document.createElement('viking-suite-search-palette-wc') as HTMLElement & {
        openPalette?: () => void;
        closePalette?: () => void;
      };
      palette.id = PALETTE_ID;
      palette.setAttribute('global-shortcut', '');
      palette.setAttribute('placeholder', 'Search documentation, dashboard, settings…');
      document.body.append(palette);
    }

    return palette;
  };

  const openSearch = (): void => {
    ensurePalette().openPalette?.();
  };

  const closeSearch = (): void => {
    document.getElementById(PALETTE_ID)?.closePalette?.();
  };

  window.DemlWidgets = window.DemlWidgets || {};
  window.DemlWidgets.openSearch = openSearch;
  window.DemlWidgets.closeSearch = closeSearch;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ensurePalette();
    });
  } else {
    ensurePalette();
  }
})();
