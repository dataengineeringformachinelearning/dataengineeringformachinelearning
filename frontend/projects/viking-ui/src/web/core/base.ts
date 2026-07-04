/** Attaches constructable stylesheet to a shadow root (with fallback). */
export const attachShadowStyles = (shadow: ShadowRoot, css: string): void => {
  if ('adoptedStyleSheets' in Document.prototype && 'replaceSync' in CSSStyleSheet.prototype) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    shadow.adoptedStyleSheets = [sheet];
    return;
  }

  const style = document.createElement('style');
  style.textContent = css;
  shadow.append(style);
};

/** Reads a boolean attribute presence/value. */
export const readBoolAttr = (el: HTMLElement, name: string): boolean =>
  el.hasAttribute(name) && el.getAttribute(name) !== 'false';
