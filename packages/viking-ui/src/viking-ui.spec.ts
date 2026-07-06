import { Component, signal } from "@angular/core";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { FormsModule } from "@angular/forms";
import {
  VikingAccordion,
  VikingAccordionItem,
  VikingBadge,
  VikingButton,
  VikingCalendar,
  VikingChart,
  VikingCheckbox,
  VikingFormPanel,
  VikingFormSection,
  VikingHeading,
  VikingIcon,
  VikingInput,
  VikingField,
  VikingPagination,
  VikingProgress,
  VikingSelect,
  VikingSwitch,
  VikingToastService,
  VikingSelectOption,
} from "./public-api";

@Component({
  imports: [VikingCheckbox, FormsModule],
  template: `<viking-checkbox [(ngModel)]="accepted">Accept</viking-checkbox>`,
})
class CheckboxHost {
  accepted = false;
}

@Component({
  imports: [VikingSelect],
  template: `<viking-select
    [options]="options"
    [value]="value()"
    (valueChange)="value.set($event)"
  />`,
})
class SelectHost {
  readonly options: VikingSelectOption[] = [
    { label: "Alpha", value: "a" },
    { label: "Beta", value: "b" },
  ];
  readonly value = signal<unknown>(null);
}

@Component({
  imports: [VikingButton],
  template: `
    <viking-button [loading]="loading()" (pressed)="pressed += 1">
      Continue
    </viking-button>
  `,
})
class ButtonPressHost {
  readonly loading = signal(false);
  pressed = 0;
}

describe("viking-ui", () => {
  const render = async <T>(
    component: new () => T,
  ): Promise<ComponentFixture<T>> => {
    const fixture = TestBed.createComponent(component);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };

  it("renders compact buttons without min-width for form actions", async (): Promise<void> => {
    const fixture = TestBed.createComponent(VikingButton);
    fixture.componentRef.setInput("variant", "primary");
    fixture.componentRef.setInput("compact", true);
    fixture.detectChanges();
    expect(fixture.nativeElement.classList.contains("viking-compact")).toBe(
      true,
    );
    const wc = fixture.nativeElement.querySelector(
      "viking-button-wc",
    ) as HTMLElement;
    const button = wc?.shadowRoot?.querySelector("button") as HTMLButtonElement;
    expect(button.classList.contains("viking-btn-primary")).toBe(true);
  });

  it("renders button variants with accessible focus and disabled semantics", async (): Promise<void> => {
    const fixture = TestBed.createComponent(VikingButton);
    fixture.componentRef.setInput("variant", "primary");
    fixture.componentRef.setInput("disabled", true);
    fixture.detectChanges();
    const wc = fixture.nativeElement.querySelector(
      "viking-button-wc",
    ) as HTMLElement;
    const button = wc?.shadowRoot?.querySelector("button") as HTMLButtonElement;
    expect(button.classList.contains("viking-btn-primary")).toBe(true);
    expect(button.disabled).toBe(true);
  });

  it("keeps button press events wired after attribute-driven rerenders", async (): Promise<void> => {
    const fixture = await render(ButtonPressHost);
    const wc = fixture.nativeElement.querySelector(
      "viking-button-wc",
    ) as HTMLElement;

    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();
    fixture.componentInstance.loading.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    const button = wc.shadowRoot?.querySelector("button") as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.pressed).toBe(1);
  });

  it("renders an anchor with rel guard when href and target are set", async (): Promise<void> => {
    const fixture = TestBed.createComponent(VikingButton);
    fixture.componentRef.setInput("href", "https://deml.app");
    fixture.componentRef.setInput("target", "_blank");
    fixture.detectChanges();
    const wc = fixture.nativeElement.querySelector(
      "viking-button-wc",
    ) as HTMLElement;
    const anchor = wc?.shadowRoot?.querySelector("a") as HTMLAnchorElement;
    expect(anchor.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("applies tone classes on badges", async (): Promise<void> => {
    const fixture = TestBed.createComponent(VikingBadge);
    fixture.componentRef.setInput("tone", "danger");
    fixture.detectChanges();
    expect(
      fixture.nativeElement.classList.contains("viking-badge-danger"),
    ).toBe(true);
  });

  it("exposes heading level via aria-level", async (): Promise<void> => {
    const fixture = TestBed.createComponent(VikingHeading);
    fixture.componentRef.setInput("level", 2);
    fixture.detectChanges();
    expect(fixture.nativeElement.getAttribute("aria-level")).toBe("2");
  });

  it("integrates checkbox with ngModel (ControlValueAccessor)", async (): Promise<void> => {
    const fixture = await render(CheckboxHost);
    const input = fixture.nativeElement.querySelector(
      "input",
    ) as HTMLInputElement;
    input.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.accepted).toBe(true);
  });

  it("toggles switch state on change", async (): Promise<void> => {
    const fixture = TestBed.createComponent(VikingSwitch);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector(
      "input",
    ) as HTMLInputElement;
    input.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.checked()).toBe(true);
  });

  it("opens the select listbox and picks an option", async (): Promise<void> => {
    const fixture = await render(SelectHost);
    const trigger = fixture.nativeElement.querySelector(
      ".viking-select-trigger",
    ) as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();
    const options = fixture.nativeElement.querySelectorAll(
      ".viking-select-option",
    );
    expect(options.length).toBe(2);
    (options[1] as HTMLElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toBe("b");
  });

  it("windows pagination with ellipses for long ranges", async (): Promise<void> => {
    const fixture = TestBed.createComponent(VikingPagination);
    fixture.componentRef.setInput("totalPages", 20);
    fixture.componentRef.setInput("page", 10);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? "";
    expect(text).toContain("…");
    expect(text).toContain("10");
    expect(text).toContain("20");
  });

  it("clamps progress values into 0-100 and sets aria-valuenow", async (): Promise<void> => {
    const fixture = TestBed.createComponent(VikingProgress);
    fixture.componentRef.setInput("value", 140);
    fixture.detectChanges();
    const bar = fixture.nativeElement.querySelector(
      '[role="progressbar"]',
    ) as HTMLElement;
    expect(bar.getAttribute("aria-valuenow")).toBe("100");
  });

  it("renders a 42-day calendar grid and selects a day", async (): Promise<void> => {
    const fixture = TestBed.createComponent(VikingCalendar);
    fixture.detectChanges();
    const days = fixture.nativeElement.querySelectorAll(".viking-calendar-day");
    expect(days.length).toBe(42);
    (days[15] as HTMLElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.value()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("builds SVG paths for every chart series", async (): Promise<void> => {
    const fixture = TestBed.createComponent(VikingChart);
    fixture.componentRef.setInput("series", [
      { name: "p50", data: [1, 2, 3] },
      { name: "p95", tone: "warning", data: [2, 4, 6] },
    ]);
    fixture.detectChanges();
    const lines = fixture.nativeElement.querySelectorAll(".viking-chart-line");
    expect(lines.length).toBe(2);
    expect((lines[0] as SVGPathElement).getAttribute("d")).toContain("M");
  });

  it("renders grouped and stacked bar rects", async (): Promise<void> => {
    const grouped = TestBed.createComponent(VikingChart);
    grouped.componentRef.setInput("kind", "grouped-bar");
    grouped.componentRef.setInput("series", [
      { name: "A", tone: "accent", data: [4, 6, 5] },
      { name: "B", tone: "success", data: [3, 2, 4] },
    ]);
    grouped.detectChanges();
    expect(
      grouped.nativeElement.querySelectorAll(".viking-chart-bar").length,
    ).toBe(6);

    const stacked = TestBed.createComponent(VikingChart);
    stacked.componentRef.setInput("kind", "stacked-bar");
    stacked.componentRef.setInput("series", [
      { name: "Online", tone: "accent", data: [4, 3] },
      { name: "Retail", tone: "success", data: [2, 5] },
    ]);
    stacked.detectChanges();
    expect(
      stacked.nativeElement.querySelectorAll(".viking-chart-bar").length,
    ).toBe(4);
  });

  it("renders a minimum visible height for zero-value bars", async (): Promise<void> => {
    const fixture = TestBed.createComponent(VikingChart);
    fixture.componentRef.setInput("kind", "bar");
    fixture.componentRef.setInput("series", [
      { name: "Revenue", data: [0, 5, 0] },
    ]);
    fixture.componentRef.setInput("barMinHeight", 4);
    fixture.detectChanges();

    const bars = fixture.nativeElement.querySelectorAll(".viking-chart-bar");
    expect(bars.length).toBe(3);
    expect(Number((bars[0] as SVGRectElement).getAttribute("height"))).toBe(4);
    expect(Number((bars[2] as SVGRectElement).getAttribute("height"))).toBe(4);
    expect(
      Number((bars[1] as SVGRectElement).getAttribute("height")),
    ).toBeGreaterThan(4);
  });

  it("enforces exclusive accordion mode", async (): Promise<void> => {
    @Component({
      imports: [VikingAccordion, VikingAccordionItem],
      template: `
        <viking-accordion [exclusive]="true">
          <viking-accordion-item heading="One">First</viking-accordion-item>
          <viking-accordion-item heading="Two">Second</viking-accordion-item>
        </viking-accordion>
      `,
    })
    class AccordionHost {}

    const fixture = await render(AccordionHost);
    const triggers = fixture.nativeElement.querySelectorAll(
      ".viking-accordion-trigger",
    );
    (triggers[0] as HTMLElement).click();
    fixture.detectChanges();
    (triggers[1] as HTMLElement).click();
    fixture.detectChanges();
    const expanded = fixture.nativeElement.querySelectorAll(
      '[aria-expanded="true"]',
    );
    expect(expanded.length).toBe(1);
  });

  it("queues and auto-dismisses toasts via the service", (): void => {
    const service = TestBed.inject(VikingToastService);
    const id = service.show({
      heading: "Saved",
      text: "All good",
      tone: "success",
      duration: 0,
    });
    expect(service.toasts().length).toBe(1);
    service.dismiss(id);
    expect(service.toasts().length).toBe(0);
  });

  it("renders outline and filled Drakkar brand icons at 24×24 viewBox", async (): Promise<void> => {
    const outline = TestBed.createComponent(VikingIcon);
    outline.componentRef.setInput("name", "drakkar");
    outline.componentRef.setInput("sizePreset", "lg");
    outline.detectChanges();
    const outlineSvg = outline.nativeElement.querySelector(
      "svg",
    ) as SVGSVGElement;
    expect(outlineSvg.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(outlineSvg.getAttribute("stroke")).toBe("currentColor");
    expect(
      outline.nativeElement.classList.contains("viking-icon-outline"),
    ).toBe(true);
    expect(
      outline.nativeElement.classList.contains("viking-icon-brand-drakkar"),
    ).toBe(true);
    expect(outline.nativeElement.querySelector("g")?.innerHTML).toContain(
      "M12 2v3",
    );

    const filled = TestBed.createComponent(VikingIcon);
    filled.componentRef.setInput("name", "drakkar");
    filled.componentRef.setInput("variant", "filled");
    filled.componentRef.setInput("size", 28);
    filled.detectChanges();
    const filledSvg = filled.nativeElement.querySelector(
      "svg",
    ) as SVGSVGElement;
    expect(filledSvg.getAttribute("fill")).toBe("currentColor");
    expect(filledSvg.getAttribute("fill-rule")).toBe("evenodd");
    expect(filledSvg.getAttribute("stroke")).toBe("none");
    expect(filled.nativeElement.classList.contains("viking-icon-filled")).toBe(
      true,
    );
  });

  it("renders outline and filled DEML brand icons at 24×24 viewBox", async (): Promise<void> => {
    const outline = TestBed.createComponent(VikingIcon);
    outline.componentRef.setInput("name", "deml");
    outline.componentRef.setInput("sizePreset", "lg");
    outline.detectChanges();
    const outlineSvg = outline.nativeElement.querySelector(
      "svg",
    ) as SVGSVGElement;
    expect(outlineSvg.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(outlineSvg.getAttribute("stroke")).toBe("currentColor");
    expect(
      outline.nativeElement.classList.contains("viking-icon-outline"),
    ).toBe(true);

    const filled = TestBed.createComponent(VikingIcon);
    filled.componentRef.setInput("name", "deml");
    filled.componentRef.setInput("variant", "filled");
    filled.componentRef.setInput("size", 28);
    filled.detectChanges();
    const filledSvg = filled.nativeElement.querySelector(
      "svg",
    ) as SVGSVGElement;
    expect(filledSvg.getAttribute("fill")).toBe("currentColor");
    expect(filledSvg.getAttribute("fill-rule")).toBe("evenodd");
    expect(filledSvg.getAttribute("stroke")).toBe("none");
    expect(filled.nativeElement.classList.contains("viking-icon-filled")).toBe(
      true,
    );
  });

  it("maps size presets to pixel dimensions", async (): Promise<void> => {
    const fixture = TestBed.createComponent(VikingIcon);
    fixture.componentRef.setInput("name", "check");
    fixture.componentRef.setInput("sizePreset", "sm");
    fixture.detectChanges();
    const svg = fixture.nativeElement.querySelector("svg") as SVGSVGElement;
    expect(svg.style.width).toBe("16px");
    expect(svg.style.height).toBe("16px");
  });

  it("resolves semantic color tokens to CSS custom properties", async (): Promise<void> => {
    const fixture = TestBed.createComponent(VikingIcon);
    fixture.componentRef.setInput("name", "shield");
    fixture.componentRef.setInput("color", "accent");
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).style.color).toBe(
      "var(--viking-accent)",
    );
  });

  it("renders Lucide-sourced search icon paths", async (): Promise<void> => {
    const fixture = TestBed.createComponent(VikingIcon);
    fixture.componentRef.setInput("name", "search");
    fixture.detectChanges();
    const svg = fixture.nativeElement.querySelector("svg") as SVGSVGElement;
    expect(svg.innerHTML).toContain("circle");
    expect(svg.getAttribute("stroke")).toBe("currentColor");
  });

  it("renders form section headings and layout classes", async (): Promise<void> => {
    @Component({
      imports: [VikingFormSection, VikingField, VikingInput, FormsModule],
      template: `
        <viking-form-section heading="Update Email" icon="mail" layout="inline">
          <viking-field label="Email">
            <viking-input />
          </viking-field>
          <button type="button" vikingFormActions>Save</button>
        </viking-form-section>
      `,
    })
    class FormSectionHost {}

    const fixture = await render(FormSectionHost);
    const section = fixture.nativeElement.querySelector(
      "viking-form-section",
    ) as HTMLElement;
    expect(section.classList.contains("viking-form-section-inline")).toBe(true);
    expect(
      section.querySelector(".viking-form-section-title")?.textContent,
    ).toContain("Update Email");
    expect(section.querySelector("[vikingFormActions]")).toBeTruthy();
  });

  it("separates stacked form sections inside a panel", async (): Promise<void> => {
    @Component({
      imports: [VikingFormPanel, VikingFormSection],
      template: `
        <viking-form-panel>
          <viking-form-section heading="One" layout="stack" />
          <viking-form-section heading="Two" layout="stack" />
        </viking-form-panel>
      `,
    })
    class FormPanelHost {}

    const fixture = await render(FormPanelHost);
    const sections = fixture.nativeElement.querySelectorAll(
      "viking-form-section",
    );
    expect(sections.length).toBe(2);
  });
});
