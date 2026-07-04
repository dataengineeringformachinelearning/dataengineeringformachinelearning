export const HTMLElementBase: typeof HTMLElement =
  typeof HTMLElement === "undefined"
    ? (class {} as unknown as typeof HTMLElement)
    : HTMLElement;

export const defineVikingElement = (
  tagName: string,
  constructor: CustomElementConstructor,
): void => {
  if (typeof customElements === "undefined") {
    return;
  }

  if (!customElements.get(tagName)) {
    customElements.define(tagName, constructor);
  }
};

export const readBooleanAttribute = (
  element: HTMLElement,
  name: string,
): boolean =>
  element.hasAttribute(name) && element.getAttribute(name) !== "false";

export const attributeValue = (
  element: HTMLElement,
  name: string,
  fallback: string,
  allowed?: ReadonlySet<string>,
): string => {
  const value = element.getAttribute(name) ?? fallback;
  return allowed && !allowed.has(value) ? fallback : value;
};
