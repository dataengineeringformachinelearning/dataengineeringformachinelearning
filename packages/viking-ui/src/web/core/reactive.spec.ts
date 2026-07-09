import { beforeEach, describe, expect, it } from "vitest";
import { parseBoolean, parseJson, parseNumber, parseSelect } from "./parsers";
import { VikingReactiveElement } from "./reactive";
import { defineCustomElement } from "./dom";

describe("viking attribute parsers", () => {
  it("parseBoolean handles presence and falsy strings", () => {
    expect(parseBoolean("")).toBe(true);
    expect(parseBoolean("true")).toBe(true);
    expect(parseBoolean("false")).toBe(false);
    expect(parseBoolean("0")).toBe(false);
    expect(parseBoolean(null)).toBe(false);
  });

  it("parseNumber falls back on invalid input", () => {
    expect(parseNumber("42")).toBe(42);
    expect(parseNumber("nope", 7)).toBe(7);
    expect(parseNumber(null, 3)).toBe(3);
  });

  it("parseJson returns undefined on bad JSON", () => {
    expect(parseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
    expect(parseJson("{")).toBeUndefined();
  });

  it("parseSelect constrains to allow-list", () => {
    expect(parseSelect("b", ["a", "b", "c"] as const)).toBe("b");
    expect(parseSelect("z", ["a", "b"] as const, "a")).toBe("a");
  });
});

class TestReactiveWc extends VikingReactiveElement<{ count: number }> {
  static readonly tag = "viking-test-reactive";
  static get observedAttributes(): string[] {
    return ["label"];
  }

  renderCount = 0;

  protected render(): void {
    this.renderCount += 1;
    const label = this.attr("label") ?? "";
    this.textContent = `${label}:${this.getProp("count") ?? 0}`;
  }
}

describe("VikingReactiveElement", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    defineCustomElement(TestReactiveWc.tag, TestReactiveWc);
  });

  it("batches multiple attribute changes into one render", async () => {
    const el = document.createElement(TestReactiveWc.tag) as TestReactiveWc;
    document.body.append(el);
    await Promise.resolve();
    const afterConnect = el.renderCount;

    el.setAttribute("label", "a");
    el.setAttribute("label", "b");
    el.setAttribute("label", "c");
    await Promise.resolve();

    expect(el.renderCount).toBe(afterConnect + 1);
    expect(el.textContent).toBe("c:0");
  });

  it("setProp schedules a render when connected", async () => {
    const el = document.createElement(TestReactiveWc.tag) as TestReactiveWc;
    document.body.append(el);
    await Promise.resolve();
    const afterConnect = el.renderCount;

    el["setProp"]("count", 3);
    await Promise.resolve();

    expect(el.renderCount).toBe(afterConnect + 1);
    expect(el.textContent).toBe(":3");
  });
});
