import {
  defineCustomElement,
  defineCustomElementAlias,
  HTMLElementBase,
} from "../core/dom";

/**
 * Framework-agnostic Viking card Web Component (light DOM — inherits global viking-card CSS).
 * Tag: `viking-card` (legacy alias: `viking-card-wc`)
 *
 * Uses light DOM so slotted content inherits `viking-card`, `viking-card-header`, and related
 * classes from the synced static CSS bundle.
 *
 * @attr compact - Applies `viking-card-compact` padding
 * @attr interactive - Hover lift for clickable cards
 * @attr title - Accessible name when the card is a landmark region
 *
 * @example
 * <viking-card-wc compact title="Event throughput">
 *   <div class="viking-card-header">
 *     <h3 class="viking-heading viking-heading-sm">Event throughput</h3>
 *   </div>
 *   <p class="viking-text-muted">8.2K events/sec</p>
 * </viking-card-wc>
 */
export class VikingCardWc extends HTMLElementBase {
  static readonly tag = "viking-card";
  static readonly legacyTag = "viking-card-wc";

  static get observedAttributes(): string[] {
    return ["compact", "interactive", "title", "loading"];
  }

  connectedCallback(): void {
    this.syncClasses();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.syncClasses();
    }
  }

  private syncClasses(): void {
    this.classList.add("viking-card");
    this.classList.toggle("viking-card-compact", this.hasAttribute("compact"));
    this.classList.toggle(
      "viking-card-interactive",
      this.hasAttribute("interactive"),
    );
    this.classList.toggle("viking-card-loading", this.hasAttribute("loading"));

    const title = this.getAttribute("title");
    if (title) {
      this.setAttribute("role", "region");
      this.setAttribute("aria-label", title);
    } else {
      this.removeAttribute("role");
      this.removeAttribute("aria-label");
    }
  }
}

export const registerVikingCardWc = (): void => {
  defineCustomElement(VikingCardWc.tag, VikingCardWc);
  defineCustomElementAlias(VikingCardWc.legacyTag, VikingCardWc);
};
