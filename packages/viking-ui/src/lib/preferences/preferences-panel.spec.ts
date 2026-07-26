import { ComponentFixture, TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  recordSuiteActivity,
  resetDefaultActivityLog,
} from "../../core/activity-log";
import { resetDefaultDisclosureStore } from "../../core/disclosure";
import { resetDefaultOnboardingStore } from "../../core/onboarding";
import { resetDefaultPreferencesStore } from "../../core/preferences";
import { VikingPreferencesService } from "./preferences.service";
import { VikingPreferencesPanel } from "./preferences-panel";

describe("VikingPreferencesPanel (integration)", () => {
  let fixture: ComponentFixture<VikingPreferencesPanel>;
  let prefs: VikingPreferencesService;

  beforeEach(async () => {
    resetDefaultPreferencesStore();
    resetDefaultDisclosureStore();
    resetDefaultOnboardingStore();
    resetDefaultActivityLog();

    await TestBed.configureTestingModule({
      imports: [VikingPreferencesPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(VikingPreferencesPanel);
    prefs = TestBed.inject(VikingPreferencesService);
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    resetDefaultPreferencesStore();
    resetDefaultDisclosureStore();
    resetDefaultOnboardingStore();
    resetDefaultActivityLog();
  });

  it("renders theme, export/import, and activity sections", () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain("Theme");
    expect(el.textContent).toContain("Export / import");
    expect(el.textContent).toContain("Recent activity");
    expect(el.textContent).toContain("No recent activity yet");
  });

  it("records activity when theme changes and lists it", () => {
    prefs.setTheme("dark");
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain("Theme set to dark");
  });

  it("shows clear activity after a recorded export action", () => {
    recordSuiteActivity({
      kind: "preferences.export",
      label: "Exported local preferences",
      source: "deml",
    });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain("Exported local preferences");
    expect(el.textContent).toContain("Clear activity");
  });
});
