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

@Component({
  imports: [VikingChart],
  template: `
    <viking-chart
      kind="line"
      [series]="series"
      [categories]="categories"
      [showArea]="true"
      label="First trend"
    />
    <viking-chart
      kind="line"
      [series]="series"
      [categories]="categories"
      [showArea]="true"
      label="Second trend"
    />
  `,
})
class MultipleChartHost {
  readonly series = [{ name: "Uptime", data: [98, 99, 98.5, 100] }];
  readonly categories = ["00:00", "06:00", "12:00", "18:00"];
}

@Component({
  imports: [VikingChart],
  template: `
    <viking-chart
      kind="line"
      [series]="series"
      [categories]="categories"
      [showArea]="true"
      [showPoints]="true"
      label="Single sample"
    />
  `,
})
class SinglePointChartHost {
  readonly series = [{ name: "Latency", data: [42] }];
  readonly categories = ["Now"];
}

describe("viking-chart responsive canvas", () => {
  const render = async (): Promise<ComponentFixture<FilledBarChartHost>> => {
    const fixture = TestBed.createComponent(FilledBarChartHost);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };

  it("keeps the SVG proportional inside a bounded plot viewport", async () => {
    const fixture = await render();
    const svg = fixture.nativeElement.querySelector("svg") as SVGElement;

    expect(svg.getAttribute("viewBox")).toBe("0 0 720 280");
    expect(svg.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.hasAttribute("aria-hidden")).toBe(false);
  });

  it("centers bar labels and ticks on their data slots", async () => {
    const fixture = await render();
    const label = fixture.nativeElement.querySelector(
      ".viking-chart-axis-x",
    ) as SVGTextElement;
    const bar = fixture.nativeElement.querySelector(
      ".viking-chart-bar",
    ) as SVGRectElement;
    const labelX = Number(label.getAttribute("x"));
    const barCenter =
      Number(bar.getAttribute("x")) + Number(bar.getAttribute("width")) / 2;

    expect(labelX).toBeCloseTo(barCenter, 1);
  });

  it("uses unique clip paths and area gradients for every chart instance", async () => {
    const fixture = TestBed.createComponent(MultipleChartHost);
    fixture.detectChanges();
    await fixture.whenStable();

    const clipPaths = Array.from(
      fixture.nativeElement.querySelectorAll("clipPath"),
    ) as SVGClipPathElement[];
    const clippedGroups = Array.from(
      fixture.nativeElement.querySelectorAll("g[clip-path]"),
    ) as SVGGElement[];
    const gradients = Array.from(
      fixture.nativeElement.querySelectorAll("linearGradient"),
    ) as SVGLinearGradientElement[];

    const clipIds = clipPaths.map((path) => path.id);
    expect(new Set(clipIds).size).toBe(2);
    expect(
      clippedGroups.map((group) => group.getAttribute("clip-path")),
    ).toEqual(clipIds.map((id) => `url(#${id})`));
    expect(new Set(gradients.map((gradient) => gradient.id)).size).toBe(2);
  });

  it("uses a padded minimum domain for line charts instead of forcing zero", async () => {
    const fixture = TestBed.createComponent(MultipleChartHost);
    fixture.detectChanges();
    await fixture.whenStable();

    const labels = Array.from(
      fixture.nativeElement.querySelectorAll(
        "viking-chart:first-of-type .viking-chart-axis-y",
      ),
    ).map((label) => Number((label as SVGTextElement).textContent?.trim()));

    expect(labels.length).toBeGreaterThan(0);
    expect(Math.min(...labels)).toBeGreaterThan(90);
  });

  it("centers a one-point series without creating a full-width area triangle", async () => {
    const fixture = TestBed.createComponent(SinglePointChartHost);
    fixture.detectChanges();
    await fixture.whenStable();

    const point = fixture.nativeElement.querySelector(
      ".viking-chart-point",
    ) as SVGCircleElement;
    const area = fixture.nativeElement.querySelector(
      ".viking-chart-area",
    ) as SVGPathElement;
    const areaXCoordinates = Array.from(
      area.getAttribute("d")?.matchAll(/([0-9]+(?:\.[0-9]+)?),/g) ?? [],
      (match) => Number(match[1]),
    );

    expect(Number(point.getAttribute("cx"))).toBe(372);
    expect(new Set(areaXCoordinates)).toEqual(new Set([372]));
  });

  it("honors point and bar radius inputs without rounding lower stack segments", async () => {
    const points = TestBed.createComponent(VikingChart);
    points.componentRef.setInput("series", [
      { name: "Latency", data: [20, 24] },
    ]);
    points.componentRef.setInput("showPoints", true);
    points.componentRef.setInput("pointRadius", 7);
    points.detectChanges();

    const point = points.nativeElement.querySelector(
      ".viking-chart-point",
    ) as SVGCircleElement;
    expect(point.getAttribute("r")).toBe("7");

    const stacked = TestBed.createComponent(VikingChart);
    stacked.componentRef.setInput("kind", "stacked-bar");
    stacked.componentRef.setInput("series", [
      { name: "Success", data: [8] },
      { name: "Errors", data: [2] },
    ]);
    stacked.componentRef.setInput("barRadius", 6);
    stacked.detectChanges();

    const bars = stacked.nativeElement.querySelectorAll(
      ".viking-chart-bar",
    ) as NodeListOf<SVGRectElement>;
    expect(bars[0].getAttribute("rx")).toBe("0");
    expect(bars[0].getAttribute("ry")).toBe("0");
    expect(bars[1].getAttribute("rx")).toBe("6");
    expect(bars[1].getAttribute("ry")).toBe("6");
  });
});
