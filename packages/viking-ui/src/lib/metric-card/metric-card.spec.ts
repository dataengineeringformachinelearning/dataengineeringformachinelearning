import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { MetricCardComponent, VikingMetricRow } from "./metric-card";

@Component({
  imports: [MetricCardComponent, VikingMetricRow],
  template: `
    <viking-metric-row>
      <viking-metric-card
        label="Cumulative SLA"
        value="100.00%"
        sublabel="Based on real telemetry"
      />
      <viking-metric-card label="P99 Latency" value="108ms" />
    </viking-metric-row>
  `,
})
class HostComponent {}

describe("Viking metric card layout", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
  });

  it("uses the shared 6/12 wide-card span", () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const cards = Array.from(
      fixture.nativeElement.querySelectorAll("viking-metric-card"),
    ) as HTMLElement[];

    expect(cards).toHaveLength(2);
    for (const card of cards) {
      expect(card.classList.contains("col-span-6")).toBe(true);
      expect(card.classList.contains("col-span-md-6")).toBe(true);
      expect(card.classList.contains("col-span-4")).toBe(false);
    }
  });
});
