/**
 * Field validation a11y — associate description/error with the control and
 * surface invalid state (WCAG 1.3.1 / 3.3.1 / 4.1.2 / 4.1.3).
 */

/** Native + suite control hosts that can receive aria-invalid / describedby. */
export const FIELD_CONTROL_SELECTOR = [
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"])',
  "textarea",
  "select",
  '[role="combobox"]',
  '[role="textbox"]',
  '[role="spinbutton"]',
  '[role="searchbox"]',
  "viking-input-wc",
].join(",");

export type FieldMessageIds = {
  descriptionId: string;
  errorId: string;
  hasDescription: boolean;
  hasError: boolean;
};

/** Space-separated id list for aria-describedby (description kept when error). */
export function fieldDescribedBy(ids: FieldMessageIds): string | null {
  const parts: string[] = [];
  if (ids.hasDescription) parts.push(ids.descriptionId);
  if (ids.hasError) parts.push(ids.errorId);
  return parts.length ? parts.join(" ") : null;
}

export function findFieldControl(root: ParentNode): HTMLElement | null {
  const found = root.querySelector(FIELD_CONTROL_SELECTOR);
  return found instanceof HTMLElement ? found : null;
}

/**
 * Wire aria-describedby + aria-invalid (+ optional required) onto the field control.
 * Safe to call from afterRenderEffect whenever messages change.
 */
export function syncFieldControlA11y(
  root: ParentNode,
  ids: FieldMessageIds & { required?: boolean },
): HTMLElement | null {
  const control = findFieldControl(root);
  if (!control) return null;

  const describedBy = fieldDescribedBy(ids);
  if (describedBy) {
    control.setAttribute("aria-describedby", describedBy);
  } else {
    control.removeAttribute("aria-describedby");
  }

  if (ids.hasError) {
    control.setAttribute("aria-invalid", "true");
    // viking-input-wc keys invalid chrome off the `error` attribute
    if (
      control.localName === "viking-input-wc" ||
      control.localName === "viking-input"
    ) {
      control.setAttribute("error", "");
    }
  } else {
    control.removeAttribute("aria-invalid");
    if (
      control.localName === "viking-input-wc" ||
      control.localName === "viking-input"
    ) {
      control.removeAttribute("error");
    }
  }

  if (ids.required) {
    control.setAttribute("aria-required", "true");
    if (
      control instanceof HTMLInputElement ||
      control instanceof HTMLTextAreaElement ||
      control instanceof HTMLSelectElement
    ) {
      control.required = true;
    }
  }

  return control;
}
