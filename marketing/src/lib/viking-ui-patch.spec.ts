import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { patchVikingSearchPaletteLandmark } from '../../scripts/patch-viking-ui.mjs';

describe('Viking UI compatibility patch', () => {
  it('demotes only the command-palette hint footer', () => {
    const source = `
      <footer class="viking-modal-footer" part="footer">Actions</footer>
      <footer class="viking-search-palette-footer" part="footer">
        Keyboard shortcuts
      </footer>
    `;

    const patched = patchVikingSearchPaletteLandmark(source);

    assert.match(
      patched,
      /<div class="viking-search-palette-footer" part="footer">/,
    );
    assert.doesNotMatch(
      patched,
      /<footer class="viking-search-palette-footer"/,
    );
    assert.match(patched, /<footer class="viking-modal-footer"/);
  });

  it('fails closed when the upstream palette markup changes', () => {
    assert.throws(
      () => patchVikingSearchPaletteLandmark('<div>No palette footer</div>'),
      /Expected one Viking search-palette footer, found 0/,
    );
  });
});
