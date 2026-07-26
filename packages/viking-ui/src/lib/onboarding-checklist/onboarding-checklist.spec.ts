import { Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getDefaultActivityLog,
  resetDefaultActivityLog,
} from "../../core/activity-log";
import {
  getDefaultOnboardingStore,
  resetDefaultOnboardingStore,
} from "../../core/onboarding";
import { VikingOnboardingChecklist } from "./onboarding-checklist";

@Component({
  imports: [VikingOnboardingChecklist],
  template: `
    <viking-onboarding-checklist
      flowId="deml-status"
      heading="Status setup"
      [steps]="steps"
      [autoHide]="false"
    />
  `,
})
class Host {
  readonly steps = [
    { id: "welcome", title: "Welcome", description: "Start here" },
    {
      id: "site",
      title: "Name your site",
      description: "Pick a slug",
      routerLink: "/settings",
    },
  ];
}

describe("VikingOnboardingChecklist (integration)", () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(async () => {
    resetDefaultOnboardingStore();
    resetDefaultActivityLog();
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    resetDefaultOnboardingStore();
    resetDefaultActivityLog();
  });

  it("renders steps and completes a checked step", () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain("Status setup");
    expect(el.textContent).toContain("Welcome");
    const checkbox = el.querySelector(
      "input.suite-onboarding-check",
    ) as HTMLInputElement;
    expect(checkbox).toBeTruthy();
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));
    fixture.detectChanges();
    expect(getDefaultOnboardingStore().isStepComplete("welcome")).toBe(true);
  });

  it("records activity when dismissed", () => {
    const el = fixture.nativeElement as HTMLElement;
    const buttons = [...el.querySelectorAll("button")];
    const dismiss = buttons.find((b) =>
      (b.textContent ?? "").includes("Dismiss"),
    ) as HTMLButtonElement | undefined;
    expect(dismiss).toBeTruthy();
    dismiss!.click();
    fixture.detectChanges();
    expect(getDefaultOnboardingStore().get().dismissed).toBe(true);
    expect(
      getDefaultActivityLog()
        .list()
        .some((e) => e.kind === "onboarding.dismiss"),
    ).toBe(true);
  });
});
