import {
  attributeValue,
  defineVikingElement,
  HTMLElementBase,
  readBooleanAttribute,
} from "../core/dom";
import { attachStyles, resetStyles } from "../core/styles";

const variants = new Set([
  "outline",
  "primary",
  "secondary",
  "danger",
  "ghost",
]);
const sizes = new Set(["sm", "md"]);

const styles = `
${resetStyles}

:host {
  display: inline-flex;
}

:host([full-width]) {
  display: flex;
  width: 100%;
}

.control {
  display: inline-flex;
  width: auto;
  min-width: var(--viking-btn-min-width, 120px);
  min-height: var(--viking-control-height);
  align-items: center;
  justify-content: center;
  gap: var(--viking-space-1);
  padding: 0 var(--viking-control-padding-x);
  border: 1px solid var(--viking-border-strong);
  border-radius: var(--viking-radius);
  background: var(--viking-surface);
  color: var(--viking-text);
  box-shadow: var(--viking-shadow-sm);
  cursor: pointer;
  font: inherit;
  font-size: var(--viking-font-size-sm);
  font-weight: var(--viking-font-weight-semibold);
  letter-spacing: var(--viking-letter-spacing-wide);
  line-height: var(--viking-line-height-snug);
  text-decoration: none;
  transition: var(--viking-transition-interactive);
  user-select: none;
  white-space: nowrap;
}

:host([full-width]) .control {
  width: 100%;
}

.control:hover:not(:disabled):not([aria-busy='true']) {
  border-color: color-mix(in srgb, var(--viking-accent) 45%, var(--viking-border-strong));
  transform: translateY(var(--viking-state-hover-lift));
}

.control:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
}

.control:disabled,
.control[aria-busy='true'] {
  cursor: not-allowed;
  opacity: var(--viking-state-disabled-opacity);
  transform: none;
}

.control[data-size='sm'] {
  min-height: var(--viking-control-height-sm);
  min-width: auto;
  padding-inline: var(--viking-space-2);
}

.control[data-variant='primary'] {
  border-color: color-mix(in srgb, var(--viking-accent) 82%, var(--viking-black));
  background: var(--viking-accent);
  color: var(--viking-accent-content);
}

.control[data-variant='secondary'] {
  border-color: color-mix(in srgb, var(--viking-accent-secondary) 82%, var(--viking-black));
  background: var(--viking-accent-secondary);
  color: var(--viking-accent-secondary-content);
}

.control[data-variant='danger'] {
  border-color: color-mix(in srgb, var(--viking-danger) 82%, var(--viking-black));
  background: var(--viking-danger);
  color: var(--viking-on-danger);
}

.control[data-variant='ghost'] {
  min-width: auto;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
}
`;

export class VikingButton extends HTMLElementBase {
  static readonly tagName = "viking-button";

  static get observedAttributes(): string[] {
    return [
      "variant",
      "size",
      "type",
      "href",
      "target",
      "disabled",
      "loading",
      "aria-label",
    ];
  }

  private readonly shadowRootRef: ShadowRoot;
  private control: HTMLAnchorElement | HTMLButtonElement | null = null;

  constructor() {
    super();
    this.shadowRootRef = this.attachShadow({ mode: "open" });
    attachStyles(this.shadowRootRef, styles);
  }

  connectedCallback(): void {
    this.render();
    this.control?.addEventListener("click", this.handleClick);
  }

  disconnectedCallback(): void {
    this.control?.removeEventListener("click", this.handleClick);
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.render();
    }
  }

  private readonly handleClick = (event: Event): void => {
    if (
      readBooleanAttribute(this, "disabled") ||
      readBooleanAttribute(this, "loading")
    ) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    this.dispatchEvent(
      new CustomEvent("viking-press", {
        bubbles: true,
        composed: true,
        detail: { sourceEvent: event },
      }),
    );
  };

  private render(): void {
    const href = this.getAttribute("href");
    const tag = href ? "a" : "button";
    const variant = attributeValue(this, "variant", "outline", variants);
    const size = attributeValue(this, "size", "md", sizes);
    const disabled =
      readBooleanAttribute(this, "disabled") ||
      readBooleanAttribute(this, "loading");
    const label = this.getAttribute("aria-label");
    const target = this.getAttribute("target");

    this.shadowRootRef.innerHTML = `
      <${tag}
        part="control"
        class="control"
        data-variant="${variant}"
        data-size="${size}"
        ${href ? `href="${href}"` : `type="${this.getAttribute("type") ?? "button"}"`}
        ${target ? `target="${target}"` : ""}
        ${target === "_blank" ? 'rel="noopener noreferrer"' : ""}
        ${disabled ? 'disabled aria-disabled="true"' : ""}
        ${readBooleanAttribute(this, "loading") ? 'aria-busy="true"' : ""}
        ${label ? `aria-label="${label}"` : ""}
      >
        <slot></slot>
      </${tag}>
    `;
    this.control = this.shadowRootRef.querySelector(tag);
  }
}

export const registerVikingButton = (): void => {
  defineVikingElement(VikingButton.tagName, VikingButton);
};
