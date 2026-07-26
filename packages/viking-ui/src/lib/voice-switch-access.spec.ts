import { Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";
import { VikingButton } from "./button/button";
import { VikingCommand } from "./command/command";
import { VikingField } from "./field/field";
import { VikingPopover } from "./popover/popover";
import { VikingSelect } from "./select/select";

@Component({
  imports: [VikingPopover, VikingButton],
  template: `
    <viking-popover [(open)]="open" label="More actions">
      <button type="button" vikingTrigger>Open menu</button>
      <p>Panel body</p>
    </viking-popover>
  `,
})
class PopoverHost {
  open = false;
}

@Component({
  imports: [VikingField, VikingSelect],
  template: `
    <viking-field label="Status">
      <viking-select
        [options]="options"
        placeholder="Select…"
        [(value)]="value"
      />
    </viking-field>
  `,
})
class SelectFieldHost {
  value: string | null = null;
  options = [
    { label: "Open", value: "open" },
    { label: "Closed", value: "closed" },
  ];
}

@Component({
  imports: [VikingCommand],
  template: ` <viking-command [(open)]="open" [items]="items" /> `,
})
class CommandHost {
  open = true;
  items = [{ id: "a", label: "Deploy", group: "Actions" }];
}

@Component({
  imports: [VikingButton],
  template: `
    <viking-button [square]="true" icon="menu" label="Open navigation" />
    <viking-button [square]="true" icon="x" />
  `,
})
class SquareButtonHost {}

describe("voice control + switch access", () => {
  const render = async <T>(
    component: new () => T,
  ): Promise<ComponentFixture<T>> => {
    const fixture = TestBed.createComponent(component);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };

  it("opens popover with Enter on the trigger (switch access)", async () => {
    const fixture = await render(PopoverHost);
    const trigger = fixture.nativeElement.querySelector(
      "[vikingTrigger]",
    ) as HTMLButtonElement;
    trigger.focus();
    trigger.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.open).toBe(true);
    expect(
      fixture.nativeElement.querySelector(".viking-popover-panel"),
    ).toBeTruthy();
  });

  it("does not override field label with select placeholder aria-label", async () => {
    const fixture = await render(SelectFieldHost);
    const combobox = fixture.nativeElement.querySelector(
      '[role="combobox"]',
    ) as HTMLButtonElement;
    expect(combobox.getAttribute("aria-label")).toBeNull();
    expect(combobox.textContent).toContain("Select…");
    expect(
      fixture.nativeElement.querySelector(".viking-field-label")?.textContent,
    ).toContain("Status");
  });

  it("exposes an in-dialog close control for the command palette", async () => {
    const fixture = await render(CommandHost);
    const close = fixture.nativeElement.querySelector(
      ".viking-command-close",
    ) as HTMLButtonElement;
    expect(close).toBeTruthy();
    expect(close.getAttribute("aria-label")).toBe("Close command palette");
    expect(
      fixture.nativeElement
        .querySelector(".viking-command-backdrop")
        ?.getAttribute("tabindex"),
    ).toBe("-1");
    close.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.open).toBe(false);
  });

  it("names square icon buttons for voice control", async () => {
    const fixture = await render(SquareButtonHost);
    const buttons = [
      ...fixture.nativeElement.querySelectorAll("button.suite-btn"),
    ] as HTMLButtonElement[];
    expect(buttons).toHaveLength(2);
    expect(buttons[0]?.getAttribute("aria-label")).toBe("Open navigation");
    // Icon-only square without label falls back to humanized icon name
    expect(buttons[1]?.getAttribute("aria-label")).toBe("x");
  });
});
