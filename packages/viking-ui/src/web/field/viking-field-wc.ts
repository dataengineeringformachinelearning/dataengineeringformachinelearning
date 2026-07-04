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
    this.syncControlA11y();
  }

  disconnectedCallback(): void {
    this.slotEl?.removeEventListener("slotchange", this.syncControlA11y);
  }

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.render();
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

  private readonly syncControlA11y = (): void => {
    const control = this.control;
    if (!control) {
      return;
    }

    const description = [
      this.getAttribute("description") ?? "",
      this.getAttribute("error") ?? "",
    ]
      .filter(Boolean)
      .join(" ");

    const label = this.getAttribute("label") ?? "";
    if (label && !control.hasAttribute("aria-label")) {
      control.setAttribute("aria-label", label);
    }
    if (description) {
      control.setAttribute("aria-description", description);
    } else {
      control.removeAttribute("aria-description");
    }

    if (this.getAttribute("error")) {
      control.setAttribute("aria-invalid", "true");
      control.setAttribute("error", this.getAttribute("error") ?? "");
    } else {
      control.removeAttribute("aria-invalid");
      if (control.getAttribute("error") === "") {
        control.removeAttribute("error");
      }
    }

    if (readBoolAttr(this, "required")) {
      control.setAttribute("required", "");
    }
  };

  private render(): void {
    const label = this.getAttribute("label") ?? "";
    const description = this.getAttribute("description") ?? "";
    const error = this.getAttribute("error") ?? "";
    const required = readBoolAttr(this, "required");

    this.shadow.innerHTML = `
      <div class="viking-field" part="field" role="group" aria-labelledby="${this.labelId}">
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
        ${
          description
            ? `<p id="${this.descriptionId}" class="viking-field-description" part="description">${escapeHtml(description)}</p>`
            : ""
        }
        ${
          error
            ? `<p id="${this.errorId}" class="viking-field-error" part="error" role="alert">${escapeHtml(error)}</p>`
            : ""
        }
      </div>
    `;

    this.slotEl = this.shadow.querySelector("slot");
    this.slotEl?.addEventListener("slotchange", this.syncControlA11y);
    this.shadow
      .querySelector(".viking-field-label")
      ?.addEventListener("click", this.focusControl);
  }
}

export const registerVikingFieldWc = (): void => {
  defineCustomElement(VikingFieldWc.tag, VikingFieldWc);
  defineCustomElementAlias(VikingFieldWc.legacyTag, VikingFieldWc);
};
