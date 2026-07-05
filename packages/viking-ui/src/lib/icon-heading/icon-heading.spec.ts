import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { VikingIconHeading } from "./icon-heading";

@Component({
  imports: [VikingIconHeading],
  template: `<viking-icon-heading icon="shield" headingLevel="h3"
    >Tenant Isolation</viking-icon-heading
  >`,
})
class HostComponent {}

describe("VikingIconHeading", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
  });

  it("renders aligned icon and title", () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const heading = fixture.nativeElement.querySelector(
      ".viking-icon-heading",
    ) as HTMLElement;
    expect(heading).toBeTruthy();
    expect(heading.querySelector(".viking-icon-heading__icon")).toBeTruthy();
    expect(
      heading.querySelector("h3.viking-icon-heading__title")?.textContent,
    ).toContain("Tenant Isolation");
  });
});
