export const HTMLElementBase: typeof HTMLElement =
  typeof HTMLElement === "undefined"
    ? (class {} as unknown as typeof HTMLElement)
    : HTMLElement;

/** Stable unique id for associating labels and controls. */
export const vikingWcUid = (prefix: string): string =>
  `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

/** Escape text for safe innerHTML insertion. */
export const escapeHtml = (value: string): string => {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return value.replace(
    /[&<>"']/g,
    (character) => entities[character] ?? character,
  );
};

/** Platform modifier label for keyboard shortcut hints. */
export const modKeyLabel = (): string =>
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/i.test(navigator.platform)
    ? "⌘"
    : "Ctrl";

/** Register a custom element when the runtime supports it (skip during SSR/prerender). */
export const defineCustomElement = (
  tag: string,
  ctor: CustomElementConstructor,
): void => {
  if (typeof customElements === "undefined" || customElements.get(tag)) {
    return;
  }
  customElements.define(tag, ctor);
};

/** Register an alias tag with a fresh subclass; customElements disallows reusing constructors. */
export const defineCustomElementAlias = <T extends CustomElementConstructor>(
  tag: string,
  ctor: T,
): void => {
  if (typeof customElements === "undefined" || customElements.get(tag)) {
    return;
  }
  customElements.define(tag, class extends ctor {});
};
