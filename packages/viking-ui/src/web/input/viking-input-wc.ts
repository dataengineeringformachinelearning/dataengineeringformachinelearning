import {
  attachElementInternals,
  attachShadowStyles,
  readBoolAttr,
  setFormValue,
} from "../core/base";
import {
  defineCustomElement,
  defineCustomElementAlias,
  escapeHtml,
  HTMLElementBase,
} from "../core/dom";
import { VIKING_INPUT_STYLES } from "../core/styles";

/**
 * Framework-agnostic Viking input Web Component with form association.
 * Tag: `viking-input` (legacy alias: `viking-input-wc`)
 *
 * @example
 * <viking-input placeholder="Email" name="email" type="email"></viking-input>
 */
export class VikingInputWc extends HTMLElementBase {
  static readonly formAssociated = true;
  static readonly tag = "viking-input";
  static readonly legacyTag = "viking-input-wc";

  static get observedAttributes(): string[] {
    return [
      "type",
      "placeholder",
      "value",
      "disabled",
      "loading",
      "clearable",
      "name",
      "autocomplete",
      "required",
      "readonly",
      "minlength",
      "maxlength",
      "pattern",
      "error",
      "aria-label",
      "aria-describedby",
      "bare",
    ];
  }

  private readonly shadow: ShadowRoot;
  private readonly internals: ElementInternals | null;
  private input: HTMLInputElement | null = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.internals = attachElementInternals(this);
    attachShadowStyles(this.shadow, VIKING_INPUT_STYLES);
  }

  connectedCallback(): void {
    this.render();
    this.syncFormValue();
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) {
      return;
    }
    if (name === "value" && this.input) {
      this.input.value = this.getAttribute("value") ?? "";
      this.syncFormValue();
      return;
    }
    this.render();
  }

  get value(): string {
    return this.input?.value ?? this.getAttribute("value") ?? "";
  }

  set value(next: string) {
    const normalized = next ?? "";
    this.setAttribute("value", normalized);
    if (this.input) {
      this.input.value = normalized;
    }
    this.syncFormValue();
  }

  private get disabled(): boolean {
    return readBoolAttr(this, "disabled");
  }

  private get loading(): boolean {
    return readBoolAttr(this, "loading");
  }

  private get clearable(): boolean {
    return readBoolAttr(this, "clearable");
  }

  private get bare(): boolean {
    return readBoolAttr(this, "bare");
  }

  private readonly onInput = (): void => {
    const next = this.input?.value ?? "";
    this.setAttribute("value", next);
    this.syncFormValue();
    this.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
    this.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  };

  private readonly onBlur = (): void => {
    this.dispatchEvent(new Event("blur", { bubbles: true, composed: true }));
  };

  private readonly onClear = (): void => {
    this.value = "";
    this.input?.focus();
    this.dispatchEvent(
      new CustomEvent("viking-cleared", { bubbles: true, composed: true }),
    );
    this.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  };

  private syncFormValue(): void {
    setFormValue(this.internals, this.value);
  }

  private render(): void {
    const shellClasses = [
      "viking-input-shell",
      this.disabled ? "viking-disabled" : "",
      this.loading ? "viking-loading" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const type = escapeHtml(this.getAttribute("type") ?? "text");
    const rawPlaceholder = this.getAttribute("placeholder") ?? "";
    const placeholder = escapeHtml(rawPlaceholder);
    const value = escapeHtml(this.getAttribute("value") ?? "");
    const label =
      this.getAttribute("aria-label") ?? (rawPlaceholder || "Text input");
    const autocomplete = escapeHtml(this.getAttribute("autocomplete") ?? "");
    const describedBy = escapeHtml(this.getAttribute("aria-describedby") ?? "");
    const minLength = escapeHtml(this.getAttribute("minlength") ?? "");
    const maxLength = escapeHtml(this.getAttribute("maxlength") ?? "");
    const pattern = escapeHtml(this.getAttribute("pattern") ?? "");
    const error = this.getAttribute("error") ?? "";
    const required = readBoolAttr(this, "required");
    const readonly = readBoolAttr(this, "readonly");
    const showClear =
      this.clearable && value.length > 0 && !this.loading && !this.bare;
    const nativeAttrs = `
      ${this.disabled || this.loading ? "disabled" : ""}
      ${required ? "required" : ""}
      ${readonly ? "readonly" : ""}
      aria-label="${escapeHtml(label)}"
      ${describedBy ? `aria-describedby="${describedBy}"` : ""}
      ${this.loading ? 'aria-busy="true"' : ""}
      ${error ? 'aria-invalid="true"' : ""}
      ${autocomplete ? `autocomplete="${autocomplete}"` : ""}
      ${minLength ? `minlength="${minLength}"` : ""}
      ${maxLength ? `maxlength="${maxLength}"` : ""}
      ${pattern ? `pattern="${pattern}"` : ""}
    `;

    if (this.bare) {
      this.shadow.innerHTML = `
        <input
          part="input"
          class="viking-input-native"
          type="${type}"
          placeholder="${placeholder}"
          value="${value}"
          ${nativeAttrs}
        />
      `;
    } else {
      this.shadow.innerHTML = `
        <div class="${shellClasses}" part="shell">
          <slot name="leading"></slot>
          <input
            part="input"
            type="${type}"
            placeholder="${placeholder}"
            value="${value}"
            ${nativeAttrs}
          />
          ${this.loading ? '<span class="viking-input-spinner" aria-hidden="true"></span>' : ""}
          ${showClear ? '<button type="button" class="viking-input-clear" aria-label="Clear input" part="clear">×</button>' : ""}
          <slot name="trailing"></slot>
        </div>
      `;
    }

    this.input = this.shadow.querySelector("input");
    this.input?.addEventListener("input", this.onInput);
    this.input?.addEventListener("blur", this.onBlur);

    const clearBtn = this.shadow.querySelector(".viking-input-clear");
    clearBtn?.addEventListener("click", this.onClear);
  }
}

export const registerVikingInputWc = (): void => {
  defineCustomElement(VikingInputWc.tag, VikingInputWc);
  defineCustomElementAlias(VikingInputWc.legacyTag, VikingInputWc);
};

/** Register only the internal wrapper tag used by Angular components. */
export const registerVikingInputWcElement = (): void => {
  defineCustomElementAlias(VikingInputWc.legacyTag, VikingInputWc);
};
