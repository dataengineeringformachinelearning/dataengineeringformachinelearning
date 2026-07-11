import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";

export type VikingLayoutDensity = "tight" | "compact" | "default" | "loose";
export type VikingGridColumns = 1 | 2 | 3 | 4;
export type VikingClusterJustify = "start" | "between" | "end";

/** Constrained, centered page canvas shared by every application surface. */
@Component({
  selector: "viking-page-shell",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[class]": "hostClass()" },
  template: `<ng-content />`,
})
export class VikingPageShell {
  readonly spacing = input<VikingLayoutDensity>("default");

  protected readonly hostClass = computed(() =>
    [
      "page-inner-wrapper",
      "viking-page-inner",
      "viking-page-stack",
      this.spacing() === "default" ? "" : `viking-stack--${this.spacing()}`,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

/** Semantic page section with the canonical cross-surface vertical rhythm. */
@Component({
  selector: "viking-section",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "viking-section" },
  template: `<ng-content />`,
})
export class VikingSection {}

/** Vertical composition primitive backed by Viking spacing tokens. */
@Component({
  selector: "viking-stack",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[class]": "hostClass()" },
  template: `<ng-content />`,
})
export class VikingStack {
  readonly spacing = input<VikingLayoutDensity>("default");
  readonly centered = input<boolean>(false);

  protected readonly hostClass = computed(() =>
    [
      "viking-stack",
      this.spacing() === "default" ? "" : `viking-stack--${this.spacing()}`,
      this.centered() ? "viking-stack--center" : "",
    ]
      .filter(Boolean)
      .join(" "),
  );
}

/** Mobile-first responsive grid with one to four predictable columns. */
@Component({
  selector: "viking-grid",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[class]": "hostClass()" },
  template: `<ng-content />`,
})
export class VikingGrid {
  readonly columns = input<VikingGridColumns>(1);
  readonly spacing =
    input<Extract<VikingLayoutDensity, "tight" | "default" | "loose">>(
      "default",
    );
  readonly equalRows = input<boolean>(false);

  protected readonly hostClass = computed(() =>
    [
      "viking-grid",
      `viking-grid--${this.columns()}`,
      this.spacing() === "default" ? "" : `viking-grid--${this.spacing()}`,
      this.equalRows() ? "viking-grid--equal-rows" : "",
    ]
      .filter(Boolean)
      .join(" "),
  );
}

/** Wrapping inline layout for actions, filters, badges, and metadata. */
@Component({
  selector: "viking-cluster",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[class]": "hostClass()" },
  template: `<ng-content />`,
})
export class VikingCluster {
  readonly justify = input<VikingClusterJustify>("start");
  readonly tight = input<boolean>(false);

  protected readonly hostClass = computed(() =>
    [
      "viking-cluster",
      this.justify() === "start" ? "" : `viking-cluster--${this.justify()}`,
      this.tight() ? "viking-cluster--tight" : "",
    ]
      .filter(Boolean)
      .join(" "),
  );
}
