import { ComponentFixture, TestBed } from "@angular/core/testing";
import { describe, expect, it, beforeEach } from "vitest";

import { VikingPipelineFlow } from "./pipeline-flow";

describe("VikingPipelineFlow", () => {
  let fixture: ComponentFixture<VikingPipelineFlow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VikingPipelineFlow],
    }).compileComponents();
    fixture = TestBed.createComponent(VikingPipelineFlow);
  });

  it("renders ordered step titles", () => {
    fixture.componentRef.setInput("steps", [
      { id: "rollup", title: "Seal & roll up", kind: "process" },
      { id: "size_anomaly", title: "Size anomaly", kind: "detect" },
    ]);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain("Seal & roll up");
    expect(text).toContain("Size anomaly");
    expect(
      fixture.nativeElement.querySelectorAll('[role="listitem"]').length,
    ).toBe(2);
  });

  it("shows empty message when there are no steps", () => {
    fixture.componentRef.setInput("steps", []);
    fixture.componentRef.setInput("emptyMessage", "Nothing yet");
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain("Nothing yet");
  });
});
