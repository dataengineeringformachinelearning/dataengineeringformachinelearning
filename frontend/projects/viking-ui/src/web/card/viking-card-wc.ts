/**
 * Framework-agnostic Viking card Web Component (light DOM — inherits global viking-card CSS).
 * Tag: `viking-card-wc`
 *
 * @example
 * <viking-card-wc compact>
 *   <div class="viking-card-header"><h3 class="viking-heading viking-heading-sm">Title</h3></div>
 *   <p class="viking-text-muted">Body copy</p>
 * </viking-card-wc>
 */
export class VikingCardWc extends HTMLElement {
  static readonly tag = 'viking-card-wc';

  static get observedAttributes(): string[] {
    return ['compact', 'interactive'];
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
  }
}

export const registerVikingCardWc = (): void => {
  if (!customElements.get(VikingCardWc.tag)) {
    customElements.define(VikingCardWc.tag, VikingCardWc);
  }
};
