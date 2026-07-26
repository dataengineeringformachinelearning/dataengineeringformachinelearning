import { ComponentFixture, TestBed } from "@angular/core/testing";
import { describe, expect, it, beforeEach } from "vitest";
import { VikingPageSkeleton } from "./page-skeleton";

describe("VikingPageSkeleton", () => {
  let fixture: ComponentFixture<VikingPageSkeleton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VikingPageSkeleton],
    }).compileComponents();
    fixture = TestBed.createComponent(VikingPageSkeleton);
  });

  it("exposes suite page-skeleton host classes and busy status", () => {
    fixture.componentRef.setInput("label", "Loading command center");
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.classList.contains("suite-page-skeleton")).toBe(true);
    expect(host.getAttribute("role")).toBe("status");
    expect(host.getAttribute("aria-busy")).toBe("true");
    expect(host.getAttribute("aria-label")).toBe("Loading command center");
  });

  it("renders dashboard metric and chart shells", () => {
    fixture.componentRef.setInput("layout", "dashboard");
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector(".suite-page-skeleton__metrics")).toBeTruthy();
    expect(host.querySelector(".suite-page-skeleton__charts")).toBeTruthy();
  });

  it("renders list layout rows", () => {
    fixture.componentRef.setInput("layout", "list");
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector(".suite-page-skeleton__list")).toBeTruthy();
  });
});
