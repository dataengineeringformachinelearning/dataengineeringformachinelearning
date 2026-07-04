/**
 * Framework-agnostic Viking card Web Component (light DOM — inherits global viking-card CSS).
 * Tag: `viking-card-wc`
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
export class VikingCardWc extends HTMLElement {
  static readonly tag = 'viking-card-wc';

  static get observedAttributes(): string[] {
    return ['compact', 'interactive', 'title'];
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
    this.classList.add('viking-card');
    this.classList.toggle('viking-card-compact', this.hasAttribute('compact'));
    this.classList.toggle('viking-card-interactive', this.hasAttribute('interactive'));

    const title = this.getAttribute('title');
    if (title) {
      this.setAttribute('role', 'region');
      this.setAttribute('aria-label', title);
    } else {
      this.removeAttribute('role');
      this.removeAttribute('aria-label');
    }
  }
}

export const registerVikingCardWc = (): void => {
  if (!customElements.get(VikingCardWc.tag)) {
    customElements.define(VikingCardWc.tag, VikingCardWc);
  }
};
