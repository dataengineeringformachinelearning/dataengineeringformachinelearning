import { defineVikingElement, readBooleanAttribute } from "../core/dom";
import { attachStyles, resetStyles } from "../core/styles";

const styles = `
${resetStyles}

:host {
  display: contents;
}

dialog {
  width: min(calc(100vw - (var(--viking-space-2) * 2)), 42rem);
  padding: 0;
  border: 1px solid var(--viking-border-strong);
  border-radius: var(--viking-radius-lg);
  background: var(--viking-surface-recipe);
  color: var(--viking-text);
  box-shadow: var(--viking-shadow-lg);
}

dialog::backdrop {
  background: var(--viking-overlay-backdrop);
}

.modal {
  display: grid;
  gap: var(--viking-space-3);
  padding: var(--viking-card-padding);
}

.header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: var(--viking-space-2);
}

.title {
  margin: 0;
  color: var(--viking-text);
  font-size: var(--viking-font-size-lg);
  line-height: var(--viking-line-height-tight);
}

.close {
  display: inline-grid;
  width: var(--viking-control-height-sm);
  height: var(--viking-control-height-sm);
  place-items: center;
  border: 1px solid var(--viking-border);
  border-radius: var(--viking-radius);
  background: var(--viking-surface-alt);
  color: var(--viking-text);
  cursor: pointer;
}

.close:focus-visible {
  outline: var(--viking-ring-width) solid var(--viking-ring);
  outline-offset: var(--viking-ring-offset);
}
`;

export class VikingModal extends HTMLElement {
  static readonly tagName = "viking-modal";

  static get observedAttributes(): string[] {
    return ["open", "label"];
  }

  private readonly shadowRootRef: ShadowRoot;
  private dialog: HTMLDialogElement | null = null;

  constructor() {
    super();
    this.shadowRootRef = this.attachShadow({ mode: "open" });
    attachStyles(this.shadowRootRef, styles);
  }

  connectedCallback(): void {
    this.render();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.syncOpenState();
    }
  }

  open(): void {
    this.setAttribute("open", "");
  }

  close(): void {
    this.removeAttribute("open");
  }

  private render(): void {
    const title = this.getAttribute("label") ?? "Dialog";
    this.shadowRootRef.innerHTML = `
      <dialog aria-label="${title}">
        <section class="modal" part="surface">
          <header class="header">
            <h2 class="title"><slot name="title">${title}</slot></h2>
            <button class="close" type="button" aria-label="Close dialog">x</button>
          </header>
          <slot></slot>
          <slot name="footer"></slot>
        </section>
      </dialog>
    `;
    this.dialog = this.shadowRootRef.querySelector("dialog");
    this.shadowRootRef
      .querySelector(".close")
      ?.addEventListener("click", () => this.close());
    this.dialog?.addEventListener("close", () => {
      if (this.hasAttribute("open")) {
        this.removeAttribute("open");
      }
      this.dispatchEvent(
        new CustomEvent("viking-close", { bubbles: true, composed: true }),
      );
    });
    this.syncOpenState();
  }

  private syncOpenState(): void {
    if (!this.dialog) {
      return;
    }

    if (readBooleanAttribute(this, "open")) {
      if (!this.dialog.open && typeof this.dialog.showModal === "function") {
        this.dialog.showModal();
      } else if (!this.dialog.open) {
        this.dialog.setAttribute("open", "");
      }
      return;
    }

    if (this.dialog.open && typeof this.dialog.close === "function") {
      this.dialog.close();
    } else {
      this.dialog.removeAttribute("open");
    }
  }
}

export const registerVikingModal = (): void => {
  defineVikingElement(VikingModal.tagName, VikingModal);
};
