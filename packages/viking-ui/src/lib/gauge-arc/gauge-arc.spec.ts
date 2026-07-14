import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";
import { VikingGaugeArc } from "./gauge-arc";

describe("viking-gauge-arc", () => {
  it("starts at the beginning of the arc and clamps the fill to its range", () => {
    const fixture = TestBed.createComponent(VikingGaugeArc);
    fixture.componentRef.setInput("value", 100);
    fixture.detectChanges();

    const fill = fixture.nativeElement.querySelector(
      ".viking-gauge-arc-fill",
    ) as SVGPathElement;
    expect(fill.getAttribute("stroke-dasharray")).toBe("125.66 125.66");

    fixture.componentRef.setInput("value", -20);
    fixture.detectChanges();
    expect(fill.getAttribute("stroke-dasharray")).toBe("0 125.66");
  });

  it("exposes a semantic success tone for health gauges", () => {
    const fixture = TestBed.createComponent(VikingGaugeArc);
    fixture.componentRef.setInput("value", 90);
    fixture.componentRef.setInput("tone", "success");
    fixture.detectChanges();

    expect(fixture.nativeElement.classList).toContain(
      "viking-gauge-arc-success",
    );
  });

  it("exposes an informational tone for watch states", () => {
    const fixture = TestBed.createComponent(VikingGaugeArc);
    fixture.componentRef.setInput("value", 70);
    fixture.componentRef.setInput("tone", "info");
    fixture.detectChanges();

    expect(fixture.nativeElement.classList).toContain("viking-gauge-arc-info");
  });
});
