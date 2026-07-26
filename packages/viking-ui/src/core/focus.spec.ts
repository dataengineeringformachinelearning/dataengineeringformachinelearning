import { describe, expect, it, vi } from "vitest";
import {
  focusFirst,
  getFocusableElements,
  isFocusable,
  nextRovingIndex,
  nextRovingIndexBothAxes,
  trapTabKey,
} from "./focus";

describe("suite focus helpers", () => {
  it("filters disabled and hidden controls", () => {
    document.body.innerHTML = `
      <div id="root">
        <button type="button">A</button>
        <button type="button" disabled>B</button>
        <a href="#x">C</a>
        <input type="hidden" />
        <button type="button" aria-disabled="true">D</button>
      </div>
    `;
    const root = document.getElementById("root")!;
    const focusable = getFocusableElements(root);
    expect(focusable.map((el) => el.textContent?.trim())).toEqual(["A", "C"]);
    expect(isFocusable(focusable[0])).toBe(true);
  });

  it("focusFirst prefers the first focusable child", () => {
    document.body.innerHTML = `
      <div id="root" tabindex="-1">
        <span>label</span>
        <button type="button" id="btn">Go</button>
      </div>
    `;
    const root = document.getElementById("root")!;
    const focused = focusFirst(root);
    expect(focused?.id).toBe("btn");
    expect(document.activeElement?.id).toBe("btn");
  });

  it("computes roving indices with wrap", () => {
    expect(nextRovingIndex("ArrowRight", 2, 3)).toBe(0);
    expect(nextRovingIndex("ArrowLeft", 0, 3)).toBe(2);
    expect(nextRovingIndex("Home", 2, 3)).toBe(0);
    expect(nextRovingIndex("End", 0, 3)).toBe(2);
    expect(nextRovingIndex("ArrowDown", 0, 3, { vertical: true })).toBe(1);
    expect(nextRovingIndex("ArrowRight", 0, 3, { vertical: true })).toBeNull();
  });

  it("supports both-axis tablist navigation", () => {
    expect(nextRovingIndexBothAxes("ArrowDown", 0, 4)).toBe(1);
    expect(nextRovingIndexBothAxes("ArrowUp", 0, 4)).toBe(3);
    expect(nextRovingIndexBothAxes("Enter", 0, 4)).toBeNull();
  });

  it("trapTabKey cycles from last to first", () => {
    document.body.innerHTML = `
      <div id="root">
        <button type="button" id="a">A</button>
        <button type="button" id="b">B</button>
      </div>
    `;
    const root = document.getElementById("root")!;
    const last = document.getElementById("b")!;
    last.focus();
    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(event, "preventDefault", {
      value: vi.fn(),
    });
    trapTabKey(event, root);
    expect(document.activeElement?.id).toBe("a");
  });
});
