import { attachShadowStyles, readBoolAttr } from "../core/base";
import {
  defineCustomElement,
  defineCustomElementAlias,
  escapeHtml,
  HTMLElementBase,
  vikingWcUid,
} from "../core/dom";
import { VIKING_FIELD_STYLES } from "../core/styles";

/**
 * Framework-agnostic Viking field stack Web Component.
 * Tag: `viking-field` (legacy alias: `viking-field-wc`)
 *
 * Description/error live in light DOM so slotted controls can reference them
 * via aria-describedby (shadow ids are not reachable from light-DOM controls).
 *
 * @attr label - Visible field label
 * @attr description - Helper text below the control
 * @attr error - Validation message; sets aria-invalid on the slotted control
 * @attr required - Adds a non-color-only required marker
 * @attr width - full | half
 *
 * @slot default - Form control, usually `viking-input`, `viking-select`, or native input/select
 */
export class VikingFieldWc extends HTMLElementBase {
  static readonly tag = "viking-field";
  static readonly legacyTag = "viking-field-wc";

  static get observedAttributes(): string[] {
    return ["label", "description", "error", "required", "width"];
  }

  private readonly shadow: ShadowRoot;
  private readonly labelId = vikingWcUid("viking-field-label");
  private readonly descriptionId = vikingWcUid("viking-field-description");
  private readonly errorId = vikingWcUid("viking-field-error");
  private slotEl: HTMLSlotElement | null = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    attachShadowStyles(this.shadow, VIKING_FIELD_STYLES);
  }

  connectedCallback(): void {
    this.render();
    this.syncLightMessages();
    this.syncControlA11y();
  }

  disconnectedCallback(): void {
    this.slotEl?.removeEventListener("slotchange", this.onSlotChange);
    this.clearLightMessages();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.render();
      this.syncLightMessages();
      this.syncControlA11y();
    }
  }

  private get control(): HTMLElement | null {
    const assigned = this.slotEl?.assignedElements({ flatten: true }) ?? [];
    return (
      assigned.find(
        (node): node is HTMLElement => node instanceof HTMLElement,
      ) ?? null
    );
  }

  private readonly focusControl = (): void => {
    const control = this.control as HTMLElement & { focus?: () => void };
    control?.focus?.();
  };

  private readonly onSlotChange = (): void => {
    this.syncControlA11y();
  };

  private clearLightMessages(): void {
    this.querySelectorAll(":scope > [data-viking-field-msg]").forEach((node) =>
      node.remove(),
    );
  }

  /**
   * Light-DOM messages so aria-describedby ids resolve for slotted controls.
   * Visual chrome comes from suite/viking global `.viking-field-*` classes.
   */
  private syncLightMessages(): void {
    this.clearLightMessages();
    const description = this.getAttribute("description") ?? "";
    const error = this.getAttribute("error") ?? "";

    if (description) {
      const p = document.createElement("p");
      p.id = this.descriptionId;
      p.className = "viking-field-description suite-field-description";
      p.setAttribute("data-viking-field-msg", "description");
      p.textContent = description;
      this.append(p);
    }

    if (error) {
      const p = document.createElement("p");
      p.id = this.errorId;
      p.className = "viking-field-error suite-field-error";
      p.setAttribute("data-viking-field-msg", "error");
      p.setAttribute("role", "alert");
      p.setAttribute("aria-live", "assertive");
      p.setAttribute("aria-atomic", "true");
      const prefix = document.createElement("span");
      prefix.className = "suite-sr-only viking-sr-only";
      prefix.textContent = "Error: ";
      p.append(prefix, document.createTextNode(error));
      this.append(p);
    }
  }

  private readonly syncControlA11y = (): void => {
    const control = this.control;
    if (!control) {
      return;
    }

    const description = this.getAttribute("description") ?? "";
    const error = this.getAttribute("error") ?? "";
    const describedBy = [
      description && this.descriptionId,
      error && this.errorId,
    ]
      .filter(Boolean)
      .join(" ");

    const label = this.getAttribute("label") ?? "";
    if (label && !control.hasAttribute("aria-label")) {
      control.setAttribute("aria-label", label);
    }

    if (describedBy) {
      control.setAttribute("aria-describedby", describedBy);
    } else {
      control.removeAttribute("aria-describedby");
    }
    control.removeAttribute("aria-description");

    if (error) {
      control.setAttribute("aria-invalid", "true");
      control.setAttribute("error", error);
    } else {
      control.removeAttribute("aria-invalid");
      control.removeAttribute("error");
    }

    if (readBoolAttr(this, "required")) {
      control.setAttribute("required", "");
      control.setAttribute("aria-required", "true");
    }
  };

  private render(): void {
    const label = this.getAttribute("label") ?? "";
    const required = readBoolAttr(this, "required");
    const hasError = !!this.getAttribute("error");

    this.shadow.innerHTML = `
      <div class="viking-field${hasError ? " viking-field-invalid" : ""}" part="field" role="group" aria-labelledby="${this.labelId}">
        ${
          label
            ? `<div class="viking-field-label-row" part="label-row">
                <span class="viking-field-label" part="label" id="${this.labelId}">
                  <span>${escapeHtml(label)}</span>
                  ${required ? `<span class="viking-field-required" aria-label="required">*</span>` : ""}
                </span>
              </div>`
            : `<span id="${this.labelId}" hidden>Form field</span>`
        }
        <div class="viking-field-control" part="control"><slot></slot></div>
      </div>
    `;

    this.slotEl = this.shadow.querySelector("slot");
    this.slotEl?.addEventListener("slotchange", this.onSlotChange);
    this.shadow
      .querySelector(".viking-field-label")
      ?.addEventListener("click", this.focusControl);
  }
}

export const registerVikingFieldWc = (): void => {
  defineCustomElement(VikingFieldWc.tag, VikingFieldWc);
  defineCustomElementAlias(VikingFieldWc.legacyTag, VikingFieldWc);
};
