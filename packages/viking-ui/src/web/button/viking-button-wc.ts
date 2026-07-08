import { attachShadowStyles, readBoolAttr } from "../core/base";
import { defineCustomElement, escapeHtml, HTMLElementBase } from "../core/dom";
import { VIKING_BUTTON_STYLES } from "../core/styles";

const VARIANTS = new Set([
  "outline",
  "primary",
  "secondary",
  "filled",
  "danger",
  "ghost",
  "subtle",
]);

const SIZES = new Set(["sm", "xs"]);

/**
 * Framework-agnostic Viking button Web Component.
 * Tag: `viking-button-wc` — for static HTML / marketing only.
 * Angular apps must use `viking-button` (native control; never nest this WC).
 *
 * Host is a layout shell only; the single interactive control is the inner
 * `<button>` / `<a>` in shadow DOM. Do not style the host as a button.
 *
 * @example
 * <viking-button-wc variant="primary">Launch</viking-button-wc>
 */
export class VikingButtonWc extends HTMLElementBase {
  /** Reserved for Angular `viking-button` — do not register as a custom element. */
  static readonly angularTag = "viking-button";
  static readonly tag = "viking-button-wc";

  static get observedAttributes(): string[] {
    return [
      "variant",
      "size",
      "type",
      "disabled",
      "loading",
      "href",
      "target",
      "aria-label",
      "aria-busy",
      "square",
      "full-width",
      "compact",
    ];
  }

  private readonly shadow: ShadowRoot;
  private control: HTMLButtonElement | HTMLAnchorElement | null = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    attachShadowStyles(this.shadow, VIKING_BUTTON_STYLES);
  }

  connectedCallback(): void {
    this.render();
    this.addEventListener("click", this.onClick);
  }

  disconnectedCallback(): void {
    this.removeEventListener("click", this.onClick);
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.render();
    }
  }

  private readonly onClick = (event: Event): void => {
    if (this.disabled || this.loading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.dispatchEvent(
      new CustomEvent("viking-press", {
        bubbles: true,
        composed: true,
        detail: event,
      }),
    );
  };

  private get variant(): string {
    const value = this.getAttribute("variant") ?? "outline";
    return VARIANTS.has(value) ? value : "outline";
  }

  private get size(): string | null {
    const value = this.getAttribute("size");
    return value && SIZES.has(value) ? value : null;
  }

  private get disabled(): boolean {
    return readBoolAttr(this, "disabled");
  }

  private get loading(): boolean {
    return readBoolAttr(this, "loading");
  }

  private get square(): boolean {
    return readBoolAttr(this, "square");
  }

  private render(): void {
    const href = this.getAttribute("href");
    const isLink = Boolean(href);
    const tag = isLink ? "a" : "button";
    // Do not set role on host; the inner native <button> or <a> provides the semantics.
    // Setting role here caused "button in button" perception with the Angular wrapper and accessibility double announcement.

    const classes = [
      "viking-btn",
      `viking-btn-${this.variant}`,
      this.size ? `viking-btn-${this.size}` : "",
      this.square ? "viking-btn-square" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const label = this.getAttribute("aria-label") ?? "";
    const busy =
      this.getAttribute("aria-busy") === "true" || this.loading ? "true" : null;
    const type = escapeHtml(this.getAttribute("type") ?? "button");
    const hrefValue = href ? escapeHtml(href) : "";
    const target = this.getAttribute("target");
    const safeTarget = target ? escapeHtml(target) : "";

    // type stays on the native control only — never leave type="button" on the host,
    // which reads as a second button to DevTools / a11y scanners.
    if (this.hasAttribute("type") && !isLink) {
      this.removeAttribute("type");
    }

    this.shadow.innerHTML = `
      <${tag}
        class="${classes}"
        part="control"
        ${isLink ? `href="${hrefValue}"` : `type="${type}"`}
        ${isLink && safeTarget ? `target="${safeTarget}"` : ""}
        ${isLink && target === "_blank" ? 'rel="noopener noreferrer"' : ""}
        ${this.disabled || this.loading ? "disabled" : ""}
        ${label ? `aria-label="${escapeHtml(label)}"` : ""}
        ${busy ? `aria-busy="${busy}"` : ""}
        ${this.disabled && isLink ? 'aria-disabled="true" tabindex="-1"' : ""}
      >
        ${this.loading ? '<span class="viking-btn-spinner" aria-hidden="true"></span>' : ""}
        <span class="viking-btn-label" part="label"><slot></slot></span>
      </${tag}>
    `;

    this.control = this.shadow.querySelector(tag);
  }
}

export const registerVikingButtonWc = (): void => {
  defineCustomElement(VikingButtonWc.tag, VikingButtonWc);
};
