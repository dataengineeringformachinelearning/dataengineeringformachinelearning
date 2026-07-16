import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";
import { VikingUptimeBar } from "../uptime-bar/uptime-bar";
import { UptimeHistoryComponent } from "./uptime-history";

describe("Viking uptime history accessibility", () => {
  it("exposes an inspectable list while hiding decorative bars", async (): Promise<void> => {
    const fixture = TestBed.createComponent(UptimeHistoryComponent);
    fixture.componentRef.setInput("data", [
      { date: "2026-07-12", status: "up" },
      { date: "2026-07-13", status: "partial" },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const list = fixture.nativeElement.querySelector(
      ".uptime-history-bar",
    ) as HTMLElement;
    const items = fixture.nativeElement.querySelectorAll(
      ".uptime-history-segment",
    ) as NodeListOf<HTMLElement>;
    const bars = fixture.nativeElement.querySelectorAll(
      "viking-uptime-bar",
    ) as NodeListOf<HTMLElement>;

    expect(list.getAttribute("role")).toBe("list");
    expect(list.getAttribute("aria-label")).toContain("Uptime history");
    expect(items).toHaveLength(2);
    expect(items[0].getAttribute("role")).toBe("listitem");
    expect(items[0].hasAttribute("aria-label")).toBe(false);
    expect(items[0].textContent?.trim()).toBe("2026-07-12: Up");
    expect(items[1].textContent?.trim()).toBe("2026-07-13: Partial");
    expect(
      Array.from(bars).every(
        (bar) => bar.getAttribute("aria-hidden") === "true",
      ),
    ).toBe(true);
    expect(
      Array.from(bars).every((bar) => !bar.hasAttribute("aria-label")),
    ).toBe(true);
  });

  it("exposes a titled standalone bar as a labelled image", (): void => {
    const fixture = TestBed.createComponent(VikingUptimeBar);
    fixture.componentRef.setInput("title", "July 13 — 100% uptime");
    fixture.detectChanges();

    const bar = fixture.nativeElement as HTMLElement;

    expect(bar.getAttribute("role")).toBe("img");
    expect(bar.getAttribute("aria-label")).toBe("July 13 — 100% uptime");
    expect(bar.hasAttribute("aria-hidden")).toBe(false);
  });

  it("announces an explicit no-data segment without claiming 100% uptime", async (): Promise<void> => {
    const fixture = TestBed.createComponent(UptimeHistoryComponent);
    fixture.componentRef.setInput("segments", [
      {
        date: "2026-07-14",
        status: "no_data",
        uptime: null,
      },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const item = fixture.nativeElement.querySelector(
      ".uptime-history-segment",
    ) as HTMLElement;
    expect(item.textContent?.trim()).toBe("2026-07-14: No data");
    expect(item.getAttribute("data-tooltip")).toBe("2026-07-14: No data");
  });
});
