import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { VikingCardTitle } from "./card-title";

@Component({
  imports: [VikingCardTitle],
  template: `<viking-card-title icon="shield">Security</viking-card-title>`,
})
class HostComponent {}

describe("VikingCardTitle", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
  });

  it("renders icon badge and heading text", () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector(
      "viking-card-title",
    ) as HTMLElement;
    expect(host.querySelector("viking-icon-badge")).toBeTruthy();
    expect(host.textContent).toContain("Security");
  });
});
