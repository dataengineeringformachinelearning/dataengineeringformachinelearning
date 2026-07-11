import { Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";
import { VikingChart } from "./chart";

@Component({
  imports: [VikingChart],
  template: `
    <viking-chart
      kind="bar"
      [series]="series"
      [categories]="categories"
      [fill]="true"
      label="Request counts"
    />
  `,
})
class FilledBarChartHost {
  readonly series = [{ name: "Requests", data: [12, 24, 18] }];
  readonly categories = ["One", "Two", "Three"];
}

describe("viking-chart responsive canvas", () => {
  const render = async (): Promise<ComponentFixture<FilledBarChartHost>> => {
    const fixture = TestBed.createComponent(FilledBarChartHost);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };

  it("stretches a populated bar chart across its full panel without clipping", async () => {
    const fixture = await render();
    const svg = fixture.nativeElement.querySelector("svg") as SVGElement;

    expect(svg.getAttribute("viewBox")).toBe("0 0 720 280");
    expect(svg.getAttribute("preserveAspectRatio")).toBe("none");
  });
});
