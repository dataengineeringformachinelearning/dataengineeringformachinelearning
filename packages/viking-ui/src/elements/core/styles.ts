export const resetStyles = `
:host {
  box-sizing: border-box;
  font-family: var(--viking-font-family);
}

*,
*::before,
*::after {
  box-sizing: inherit;
}
`;

export const attachStyles = (shadow: ShadowRoot, css: string): void => {
  if (
    "adoptedStyleSheets" in Document.prototype &&
    "replaceSync" in CSSStyleSheet.prototype
  ) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    shadow.adoptedStyleSheets = [sheet];
    return;
  }

  const style = document.createElement("style");
  style.textContent = css;
  shadow.append(style);
};
