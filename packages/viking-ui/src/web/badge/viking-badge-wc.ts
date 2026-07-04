import { attachShadowStyles } from "../core/base";
import {
  defineCustomElement,
  defineCustomElementAlias,
  HTMLElementBase,
} from "../core/dom";
import { renderInlineIcon, TONE_ICON_NAMES } from "../core/icons-inline";
import { VIKING_BADGE_STYLES } from "../core/styles";
import type { VikingWcTone } from "../core/types";

const TONES = new Set<VikingWcTone>([
  "accent",
  "secondary",
  "success",
  "warning",
  "danger",
  "info",
  "muted",
  "subtle",
]);

/**
 * Framework-agnostic Viking badge Web Component.
 * Tag: `viking-badge` (legacy alias: `viking-badge-wc`)
 *
 * @attr tone - Semantic color: accent | secondary | success | warning | danger | info | muted
 * @attr size - Compact density: sm
 * @attr icon - Viking icon registry name (pairs with label for a11y)
 * @attr removable - Shows remove control; dispatches `viking-removed`
 *
 * @example
 * <viking-badge-wc tone="success" icon="check">Healthy</viking-badge-wc>
 */
export class VikingBadgeWc extends HTMLElementBase {
  static readonly tag = "viking-badge";
  static readonly legacyTag = "viking-badge-wc";

  static get observedAttributes(): string[] {
    return ["tone", "size", "icon", "removable"];
  }

  private readonly shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    attachShadowStyles(this.shadow, VIKING_BADGE_STYLES);
  }

  connectedCallback(): void {
    this.render();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.render();
    }
  }

  private get tone(): VikingWcTone | null {
    const value = (this.getAttribute("tone") ?? "") as VikingWcTone;
    return TONES.has(value) ? value : null;
  }

  private get size(): "sm" | null {
    return this.getAttribute("size") === "sm" ? "sm" : null;
  }

  private get removable(): boolean {
    return (
      this.hasAttribute("removable") &&
      this.getAttribute("removable") !== "false"
    );
  }

  private readonly onRemove = (): void => {
    this.dispatchEvent(
      new CustomEvent("viking-removed", { bubbles: true, composed: true }),
    );
  };

  private render(): void {
    const tone = this.tone;
    if (tone && this.getAttribute("tone") !== tone) {
      this.setAttribute("tone", tone);
    } else if (!tone && this.hasAttribute("tone")) {
      this.removeAttribute("tone");
    }

    const size = this.size;
    if (size && this.getAttribute("size") !== size) {
      this.setAttribute("size", size);
    } else if (!size && this.hasAttribute("size")) {
      this.removeAttribute("size");
    }

    const iconName =
      this.getAttribute("icon") ?? (tone ? TONE_ICON_NAMES[tone] : null);
    const iconMarkup = iconName ? renderInlineIcon(iconName, 16) : "";

    this.shadow.innerHTML = `
      ${iconMarkup}
      <span part="label"><slot></slot></span>
      ${this.removable ? `<button type="button" class="viking-badge-remove" part="remove" aria-label="Remove">${renderInlineIcon("x", 14)}</button>` : ""}
    `;

    this.shadow
      .querySelector(".viking-badge-remove")
      ?.addEventListener("click", this.onRemove);
  }
}

export const registerVikingBadgeWc = (): void => {
  defineCustomElement(VikingBadgeWc.tag, VikingBadgeWc);
  defineCustomElementAlias(VikingBadgeWc.legacyTag, VikingBadgeWc);
};
