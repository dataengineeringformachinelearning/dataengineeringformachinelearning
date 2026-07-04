/** Stable unique id for associating labels and controls. */
export const vikingWcUid = (prefix: string): string =>
  `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

/** Escape text for safe innerHTML insertion. */
export const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

/** Platform modifier label for keyboard shortcut hints. */
export const modKeyLabel = (): string =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform) ? '⌘' : 'Ctrl';
