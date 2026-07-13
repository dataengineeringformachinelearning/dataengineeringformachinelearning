import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { VikingAppLayout } from "./app-layout";

@Component({
  imports: [VikingAppLayout],
  template: `
    <viking-app-layout
      [hasSidebar]="true"
      [sidebarCollapsible]="true"
      [autoOpenSidebar]="false"
    >
      <nav vikingAppLayoutSidebar>Primary navigation</nav>
      <main vikingAppLayoutContent>Dashboard content</main>
    </viking-app-layout>
  `,
})
class HostComponent {}

describe("Viking app layout responsive sidebar", () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
  });

  it("opens and closes the mobile navigation with accessible state", () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const layout = fixture.nativeElement.querySelector(
      "viking-app-layout",
    ) as HTMLElement;
    const sidebar = fixture.nativeElement.querySelector(
      "#viking-app-layout-sidebar",
    ) as HTMLElement;
    const toggle = fixture.nativeElement.querySelector(
      'button[aria-label="Toggle navigation"]',
    ) as HTMLButtonElement;

    expect(
      layout.classList.contains("viking-app-layout--sidebar-toggle-only"),
    ).toBe(true);
    expect(sidebar.getAttribute("aria-hidden")).toBe("true");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");

    toggle.click();
    fixture.detectChanges();

    expect(sidebar.getAttribute("aria-hidden")).toBe("false");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const scrim = fixture.nativeElement.querySelector(
      'button[aria-label="Close application panels"]',
    ) as HTMLButtonElement;
    expect(scrim).not.toBeNull();

    scrim.click();
    fixture.detectChanges();

    expect(sidebar.getAttribute("aria-hidden")).toBe("true");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });
});
