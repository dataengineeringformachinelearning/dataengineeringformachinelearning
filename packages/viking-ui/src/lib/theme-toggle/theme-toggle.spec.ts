import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { VikingThemeToggle } from "./theme-toggle";

@Component({
  imports: [VikingThemeToggle],
  template: `<viking-theme-toggle [theme]="theme" (toggle)="toggled = true" />`,
})
class HostComponent {
  theme: "light" | "dark" = "dark";
  toggled = false;
}

describe("VikingThemeToggle", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
  });

  it("shows sun icon in dark mode", () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector(
      ".theme-toggle-btn",
    ) as HTMLButtonElement;
    expect(btn.getAttribute("aria-label")).toBe("Toggle light and dark theme");
    expect(btn.querySelector("viking-icon")).toBeTruthy();
  });

  it("emits toggle on click", () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector(
      ".theme-toggle-btn",
    ) as HTMLButtonElement;
    btn.click();
    expect(fixture.componentInstance.toggled).toBe(true);
  });
});
