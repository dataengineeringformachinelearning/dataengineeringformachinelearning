import { attachShadowStyles, readBoolAttr } from "../core/base";
import { defineCustomElement, HTMLElementBase } from "../core/dom";
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
 * Tag: `viking-button-wc`
 *
 * @example
 * <viking-button-wc variant="primary">Launch</viking-button-wc>
 */
export class VikingButtonWc extends HTMLElementBase {
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
    this.control?.addEventListener("click", this.onClick);
  }

  disconnectedCallback(): void {
    this.control?.removeEventListener("click", this.onClick);
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

    this.shadow.innerHTML = `
      <${tag}
        class="${classes}"
        part="control"
        ${isLink ? `href="${href}"` : `type="${this.getAttribute("type") ?? "button"}"`}
        ${isLink && this.getAttribute("target") ? `target="${this.getAttribute("target")}"` : ""}
        ${isLink && this.getAttribute("target") === "_blank" ? 'rel="noopener noreferrer"' : ""}
        ${this.disabled || this.loading ? "disabled" : ""}
        ${label ? `aria-label="${label}"` : ""}
        ${busy ? `aria-busy="${busy}"` : ""}
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
