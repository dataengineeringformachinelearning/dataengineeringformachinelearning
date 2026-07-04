import { defineVikingElement, HTMLElementBase } from "../core/dom";
import { attachStyles, resetStyles } from "../core/styles";

const styles = `
${resetStyles}

:host {
  display: block;
}

.card {
  display: grid;
  gap: var(--viking-space-2);
  padding: var(--viking-card-padding);
  border: 1px solid var(--viking-border);
  border-radius: var(--viking-radius-lg);
  background: var(--viking-surface-recipe);
  color: var(--viking-text);
  box-shadow: var(--viking-shadow-sm);
}

:host([compact]) .card {
  padding: var(--viking-card-padding-compact);
}

::slotted([slot='header']) {
  color: var(--viking-text);
  font-weight: var(--viking-font-weight-semibold);
}

::slotted([slot='footer']) {
  color: var(--viking-text-muted);
}
`;

export class VikingCard extends HTMLElementBase {
  static readonly tagName = "viking-card";

  private readonly shadowRootRef: ShadowRoot;

  constructor() {
    super();
    this.shadowRootRef = this.attachShadow({ mode: "open" });
    attachStyles(this.shadowRootRef, styles);
  }

  connectedCallback(): void {
    this.shadowRootRef.innerHTML = `
      <article class="card" part="surface">
        <slot name="header"></slot>
        <slot></slot>
        <slot name="footer"></slot>
      </article>
    `;
  }
}

export const registerVikingCard = (): void => {
  defineVikingElement(VikingCard.tagName, VikingCard);
};
