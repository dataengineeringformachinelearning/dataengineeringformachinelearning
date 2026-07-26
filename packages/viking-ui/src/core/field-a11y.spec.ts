import { describe, expect, it } from "vitest";
import {
  fieldDescribedBy,
  findFieldControl,
  syncFieldControlA11y,
} from "./field-a11y";

describe("field a11y helpers", () => {
  it("builds describedby with description kept when error is present", () => {
    expect(
      fieldDescribedBy({
        descriptionId: "d",
        errorId: "e",
        hasDescription: true,
        hasError: true,
      }),
    ).toBe("d e");
    expect(
      fieldDescribedBy({
        descriptionId: "d",
        errorId: "e",
        hasDescription: false,
        hasError: true,
      }),
    ).toBe("e");
    expect(
      fieldDescribedBy({
        descriptionId: "d",
        errorId: "e",
        hasDescription: false,
        hasError: false,
      }),
    ).toBeNull();
  });

  it("wires aria-invalid and aria-describedby onto a native control", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <label><input type="email" /></label>
      <p id="desc">Helper</p>
      <p id="err">Bad value</p>
    `;
    const control = syncFieldControlA11y(root, {
      descriptionId: "desc",
      errorId: "err",
      hasDescription: true,
      hasError: true,
      required: true,
    });
    expect(control).toBe(findFieldControl(root));
    expect(control?.getAttribute("aria-describedby")).toBe("desc err");
    expect(control?.getAttribute("aria-invalid")).toBe("true");
    expect(control?.getAttribute("aria-required")).toBe("true");
    expect((control as HTMLInputElement).required).toBe(true);
  });

  it("clears invalid state when error is removed", () => {
    const root = document.createElement("div");
    root.innerHTML = `<input type="text" aria-invalid="true" aria-describedby="err" />`;
    syncFieldControlA11y(root, {
      descriptionId: "desc",
      errorId: "err",
      hasDescription: false,
      hasError: false,
    });
    const control = findFieldControl(root);
    expect(control?.hasAttribute("aria-invalid")).toBe(false);
    expect(control?.hasAttribute("aria-describedby")).toBe(false);
  });
});
