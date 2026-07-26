import { Component } from "@angular/core";
import { TestBed, ComponentFixture } from "@angular/core/testing";
import { FormsModule } from "@angular/forms";
import { describe, it, expect } from "vitest";
import { VikingField } from "./field/field";
import { VikingInput } from "./input/input";
import { VikingFormSection } from "./form-section/form-section";
import { VikingOtpInput } from "./otp-input/otp-input";

@Component({
  imports: [VikingField, VikingInput, FormsModule],
  template: `
    <viking-field label="Email" [required]="true" [error]="error">
      <viking-input [(ngModel)]="email" placeholder="you@example.com" />
    </viking-field>
  `,
})
class FieldInputHost {
  email = "";
  error = "";
}

@Component({
  imports: [VikingField, VikingInput, FormsModule],
  template: `
    <viking-field
      label="Email"
      description="Work email only"
      [error]="error"
      [required]="true"
    >
      <viking-input [(ngModel)]="email" placeholder="you@example.com" />
    </viking-field>
  `,
})
class DescribedFieldHost {
  email = "";
  error = "Invalid email address";
}

@Component({
  imports: [VikingFormSection, VikingField, VikingInput, FormsModule],
  template: `
    <viking-form-section heading="Profile" icon="user" layout="stack">
      <viking-field label="Display name">
        <viking-input [(ngModel)]="name" />
      </viking-field>
    </viking-form-section>
  `,
})
class FormStackHost {
  name = "";
}

@Component({
  imports: [VikingOtpInput, FormsModule],
  template: `
    <viking-otp-input
      [(ngModel)]="code"
      name="one-time-code"
      label="SMS code"
    />
  `,
})
class OtpInputHost {
  code = "";
}

describe("viking forms", () => {
  const render = async <T>(
    component: new () => T,
  ): Promise<ComponentFixture<T>> => {
    const fixture = TestBed.createComponent(component);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };

  it("renders required marker and associates label with input", async () => {
    const fixture = await render(FieldInputHost);
    const label = fixture.nativeElement.querySelector(".viking-field-label");
    expect(label?.textContent).toContain("Email");
    expect(label?.querySelector(".viking-field-required")).toBeTruthy();
    expect(fixture.nativeElement.querySelector("viking-input-wc")).toBeTruthy();
  });

  it("shows error alert and invalid host class", async () => {
    const fixture = await render(FieldInputHost);
    fixture.componentInstance.error = "Invalid email address";
    fixture.detectChanges();
    await fixture.whenStable();
    const field = fixture.nativeElement.querySelector(
      "viking-field",
    ) as HTMLElement;
    expect(field.classList.contains("viking-field-invalid")).toBe(true);
    const alert = fixture.nativeElement.querySelector(
      ".viking-field-error",
    ) as HTMLElement;
    expect(alert.getAttribute("role")).toBe("alert");
    expect(alert.getAttribute("aria-live")).toBe("assertive");
    expect(alert.textContent).toContain("Invalid email address");
    expect(alert.textContent).toContain("Error:");
  });

  it("associates description and error with the control", async () => {
    const fixture = await render(DescribedFieldHost);
    const desc = fixture.nativeElement.querySelector(
      ".viking-field-description",
    ) as HTMLElement;
    const err = fixture.nativeElement.querySelector(
      ".viking-field-error",
    ) as HTMLElement;
    const control = fixture.nativeElement.querySelector(
      "viking-input-wc",
    ) as HTMLElement;
    expect(desc?.id).toBeTruthy();
    expect(err?.id).toBeTruthy();
    expect(control.getAttribute("aria-invalid")).toBe("true");
    const describedBy = control.getAttribute("aria-describedby") ?? "";
    expect(describedBy.split(/\s+/)).toEqual(
      expect.arrayContaining([desc.id, err.id]),
    );
    // Description stays visible alongside the error
    expect(desc.textContent).toContain("Work email only");
  });

  it("binds input value via ngModel (ControlValueAccessor)", async () => {
    const fixture = await render(FieldInputHost);
    const wc = fixture.nativeElement.querySelector(
      "viking-input-wc",
    ) as HTMLElement;
    const input = wc.shadowRoot?.querySelector("input") as HTMLInputElement;
    input.value = "ops@deml.app";
    input.dispatchEvent(new Event("input"));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.email).toBe("ops@deml.app");
  });

  it("accepts a complete autofilled one-time code in one native input", async () => {
    const fixture = await render(OtpInputHost);
    const input = fixture.nativeElement.querySelector(
      ".viking-otp-input",
    ) as HTMLInputElement;

    expect(
      fixture.nativeElement.querySelectorAll(".viking-otp-input"),
    ).toHaveLength(1);
    expect(input.autocomplete).toBe("one-time-code");
    expect(input.name).toBe("one-time-code");
    expect(input.maxLength).toBe(6);

    input.value = "123456";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.code).toBe("123456");
  });

  it("normalizes pasted one-time codes without stopping after one digit", async () => {
    const fixture = await render(OtpInputHost);
    const input = fixture.nativeElement.querySelector(
      ".viking-otp-input",
    ) as HTMLInputElement;

    input.value = "12 34-56";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(input.value).toBe("123456");
    expect(fixture.componentInstance.code).toBe("123456");
  });

  it("does not register the Angular wrapper tag as a custom element", async () => {
    await render(FieldInputHost);
    expect(customElements.get("viking-input")).toBeUndefined();
    expect(customElements.get("viking-input-wc")).toBeDefined();
  });

  it("renders stacked form section with icon heading", async () => {
    const fixture = await render(FormStackHost);
    const section = fixture.nativeElement.querySelector(
      "viking-form-section",
    ) as HTMLElement;
    expect(section.classList.contains("viking-form-section-stack")).toBe(true);
    expect(
      section.querySelector(".viking-form-section-title")?.textContent,
    ).toContain("Profile");
  });
});
