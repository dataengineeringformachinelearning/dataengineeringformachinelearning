import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { ExploreCardComponent, type ExploreCardMetric } from "./explore-card";

@Component({
  imports: [ExploreCardComponent],
  template: `
    <viking-explore-card
      title="joealongi"
      description="Personal site status"
      [metrics]="metrics"
    />
  `,
})
class HostComponent {
  readonly metrics: ExploreCardMetric[] = [
    { icon: "server", label: "Cumulative SLA", value: "100.00%" },
    { icon: "clock", label: "P99 Latency", value: "108ms" },
    { icon: "trending-up", label: "Spike Risk", value: "83.74" },
    { icon: "shield", label: "Threat Anomaly", value: "94.53%" },
  ];
}

describe("Viking explore card layout", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
  });

  it("renders every metric through the equal-row metric grid", () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const grid = fixture.nativeElement.querySelector(
      ".viking-explore-card-metrics",
    ) as HTMLElement;
    const metrics = grid.querySelectorAll("viking-explore-card-metric");

    expect(grid).toBeTruthy();
    expect(metrics).toHaveLength(4);
    expect(grid.textContent).toContain("Cumulative SLA");
    expect(grid.textContent).toContain("Threat Anomaly");
  });
});
