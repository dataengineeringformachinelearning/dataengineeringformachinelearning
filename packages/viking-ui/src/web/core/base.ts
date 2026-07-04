/** Attaches constructable stylesheet to a shadow root (with fallback). */
export const attachShadowStyles = (shadow: ShadowRoot, css: string): void => {
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

/** Reads a boolean attribute presence/value. */
export const readBoolAttr = (el: HTMLElement, name: string): boolean =>
  el.hasAttribute(name) && el.getAttribute(name) !== "false";

/** Safely sets form value when ElementInternals is fully supported (e.g. not in jsdom). */
export const setFormValue = (
  internals: ElementInternals,
  value: string,
): void => {
  if (typeof internals.setFormValue === "function") {
    internals.setFormValue(value);
  }
};

/** Opens a native dialog when showModal is available. */
export const showModalDialog = (dialog: HTMLDialogElement | null): void => {
  if (dialog && typeof dialog.showModal === "function" && !dialog.open) {
    dialog.showModal();
  }
};

/** Closes a native dialog when close is available. */
export const closeModalDialog = (dialog: HTMLDialogElement | null): void => {
  if (dialog && typeof dialog.close === "function" && dialog.open) {
    dialog.close();
  }
};
