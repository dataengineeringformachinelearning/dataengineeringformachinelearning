import { ComponentFixture, TestBed } from "@angular/core/testing";
import { describe, expect, it, beforeEach } from "vitest";

import { VikingStreamStatus } from "./stream-status";

describe("VikingStreamStatus", () => {
  let fixture: ComponentFixture<VikingStreamStatus>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VikingStreamStatus],
    }).compileComponents();
    fixture = TestBed.createComponent(VikingStreamStatus);
  });

  it("renders label and pulses only when requested", () => {
    fixture.componentRef.setInput("label", "Updating");
    fixture.componentRef.setInput("phase", "updating");
    fixture.componentRef.setInput("pulse", true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("Updating");
    expect(fixture.nativeElement.querySelector(".pulse-dot")).not.toBeNull();
  });

  it("does not pulse when delayed", () => {
    fixture.componentRef.setInput("label", "Updates delayed");
    fixture.componentRef.setInput("phase", "delayed");
    fixture.componentRef.setInput("pulse", false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector(".pulse-dot")).toBeNull();
  });
});
