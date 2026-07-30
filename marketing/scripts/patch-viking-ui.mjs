const searchPaletteFooter =
  /<footer class="viking-search-palette-footer" part="footer">([\s\S]*?)<\/footer>/g;

/**
 * Viking UI 10 renders the command palette shortcut hint as a page footer.
 * Demote only that hint container so opening search cannot create a second
 * contentinfo landmark alongside the site's real footer.
 *
 * @param {string} source
 */
export const patchVikingSearchPaletteLandmark = source => {
  const matches = [...source.matchAll(searchPaletteFooter)];
  if (matches.length !== 1) {
    throw new Error(
      `Expected one Viking search-palette footer, found ${matches.length}`,
    );
  }

  return source.replace(
    searchPaletteFooter,
    '<div class="viking-search-palette-footer" part="footer">$1</div>',
  );
};
