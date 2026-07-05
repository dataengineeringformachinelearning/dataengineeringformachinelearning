import {
  attachShadowStyles,
  closeModalDialog,
  showModalDialog,
} from "../core/base";
import {
  defineCustomElement,
  defineCustomElementAlias,
  escapeHtml,
  HTMLElementBase,
} from "../core/dom";
import { renderInlineIcon } from "../core/icons-inline";
import { VIKING_MODAL_STYLES } from "../core/styles";

/**
 * Framework-agnostic modal Web Component using native `<dialog>` semantics.
 * Tag: `viking-modal-wc` (Angular reserves `viking-modal`; alias: `viking-dialog`)
 *
 * @attr open - When present, shows the modal
 * @attr title - Dialog title for aria-label / heading
 * @attr dismissible - Allow Escape and backdrop click to close (default: true)
 *
 * @slot default - Modal body content
 * @slot actions - Footer action buttons
 *
 * @method openModal() - Programmatically open
 * @method closeModal() - Programmatically close
 *
 * @event viking-close - Fired when the dialog closes
 *
 * @example
 * <viking-modal-wc title="Confirm deploy">
 *   <p>Push v2.0.0 to production?</p>
 *   <viking-button-wc slot="actions" variant="primary">Deploy</viking-button-wc>
 * </viking-modal-wc>
 */
export class VikingModalWc extends HTMLElementBase {
  /** Reserved for Angular `viking-modal` — do not register as a custom element. */
  static readonly angularTag = "viking-modal";
  static readonly tag = "viking-modal-wc";
  static readonly dialogTag = "viking-dialog";

  static get observedAttributes(): string[] {
    return ["open", "title", "dismissible"];
  }

  private readonly shadow: ShadowRoot;
  private dialogEl: HTMLDialogElement | null = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    attachShadowStyles(this.shadow, VIKING_MODAL_STYLES);
  }

  connectedCallback(): void {
    this.render();
    this.syncOpen();
    this.dialogEl?.addEventListener("close", this.onClose);
    this.dialogEl?.addEventListener("click", this.onBackdropClick);
  }

  disconnectedCallback(): void {
    this.dialogEl?.removeEventListener("close", this.onClose);
    this.dialogEl?.removeEventListener("click", this.onBackdropClick);
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) {
      return;
    }
    if (name === "open") {
      this.syncOpen();
      return;
    }
    if (name === "title") {
      this.updateTitle();
      return;
    }
    if (name === "dismissible") {
      this.render();
      this.syncOpen();
    }
  }

  /** Opens the modal dialog. */
  openModal(): void {
    this.setAttribute("open", "");
    this.syncOpen();
  }

  /** Closes the modal dialog. */
  closeModal(): void {
    this.removeAttribute("open");
    closeModalDialog(this.dialogEl);
  }

  /** @deprecated Use openModal() */
  open(): void {
    this.openModal();
  }

  /** @deprecated Use closeModal() */
  close(): void {
    this.closeModal();
  }

  private get dismissible(): boolean {
    return this.getAttribute("dismissible") !== "false";
  }

  private readonly onClose = (): void => {
    this.removeAttribute("open");
    this.dispatchEvent(
      new CustomEvent("viking-close", { bubbles: true, composed: true }),
    );
  };

  private readonly onBackdropClick = (event: MouseEvent): void => {
    if (!this.dismissible) {
      return;
    }
    if (event.target === this.dialogEl) {
      this.closeModal();
    }
  };

  private syncOpen(): void {
    if (!this.dialogEl) {
      return;
    }
    const shouldOpen = this.hasAttribute("open");
    if (shouldOpen && !this.dialogEl.open) {
      showModalDialog(this.dialogEl);
      queueMicrotask(() => {
        const closeBtn = this.shadow.querySelector<HTMLButtonElement>(
          ".viking-modal-close",
        );
        (closeBtn ?? this.dialogEl)?.focus();
      });
    } else if (!shouldOpen && this.dialogEl.open) {
      closeModalDialog(this.dialogEl);
    }
  }

  private updateTitle(): void {
    const title = this.getAttribute("title") ?? "Dialog";
    const heading = this.shadow.querySelector(".viking-modal-heading");
    if (heading) {
      heading.textContent = title;
    }
    this.dialogEl?.setAttribute("aria-label", title);
  }

  private render(): void {
    const title = this.getAttribute("title") ?? "Dialog";

    this.shadow.innerHTML = `
      <dialog class="viking-modal-backdrop" aria-label="${escapeHtml(title)}" aria-modal="true">
        <div class="viking-modal-panel" part="panel" role="document">
          <header class="viking-modal-header" part="header">
            <h2 class="viking-modal-heading" part="title">${escapeHtml(title)}</h2>
            ${this.dismissible ? `<button type="button" class="viking-modal-close" part="close" aria-label="Close dialog">${renderInlineIcon("x", 20)}</button>` : ""}
          </header>
          <div class="viking-modal-body" part="body"><slot></slot></div>
          <footer class="viking-modal-footer" part="footer"><slot name="actions"></slot></footer>
        </div>
      </dialog>
    `;

    this.dialogEl = this.shadow.querySelector("dialog");
    this.shadow
      .querySelector(".viking-modal-close")
      ?.addEventListener("click", () => this.closeModal());
    this.dialogEl?.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.dismissible) {
        event.preventDefault();
        this.closeModal();
      }
    });
  }
}

export const registerVikingModalWc = (): void => {
  defineCustomElement(VikingModalWc.tag, VikingModalWc);
  defineCustomElementAlias(VikingModalWc.dialogTag, VikingModalWc);
};
