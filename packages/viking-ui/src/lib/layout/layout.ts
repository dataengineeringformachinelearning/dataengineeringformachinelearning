import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";

export type VikingLayoutDensity = "tight" | "compact" | "default" | "loose";
export type VikingGridColumns = 1 | 2 | 3 | 4 | 6 | 12 | "auto";
export type VikingGridSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type VikingColumnLayoutColumns = 1 | 2 | 3 | 4 | "auto";
export type VikingFormGridColumns = 1 | 2 | 3 | "auto";
export type VikingClusterJustify = "start" | "between" | "end";
export type VikingIntrinsicItemSize = "compact" | "default" | "wide";

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

/** Mobile-first responsive grid with equal columns, intrinsic flow, or 12 tracks. */
@Component({
  selector: "viking-grid",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[class]": "hostClass()" },
  template: `<ng-content />`,
})
export class VikingGrid {
  readonly columns = input<VikingGridColumns>(1);
  readonly itemSize = input<VikingIntrinsicItemSize>("default");
  readonly spacing =
    input<Extract<VikingLayoutDensity, "tight" | "default" | "loose">>(
      "default",
    );
  readonly equalRows = input<boolean>(false);

  protected readonly hostClass = computed(() =>
    [
      "viking-grid",
      `viking-grid--${this.columns()}`,
      this.columns() === "auto" ? `viking-grid--item-${this.itemSize()}` : "",
      this.spacing() === "default" ? "" : `viking-grid--${this.spacing()}`,
      this.equalRows() ? "viking-grid--equal-rows" : "",
    ]
      .filter(Boolean)
      .join(" "),
  );
}

/** Equal-height grid recipe for peer cards, charts, HUD panels, and status surfaces. */
@Component({
  selector: "viking-panel-grid",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[class]": "hostClass()" },
  template: `<ng-content />`,
})
export class VikingPanelGrid {
  readonly columns = input<VikingGridColumns>(2);
  readonly itemSize = input<VikingIntrinsicItemSize>("default");
  readonly spacing =
    input<Extract<VikingLayoutDensity, "tight" | "default" | "loose">>(
      "default",
    );

  protected readonly hostClass = computed(() =>
    [
      "viking-grid",
      "viking-panel-grid",
      `viking-grid--${this.columns()}`,
      this.columns() === "auto" ? `viking-grid--item-${this.itemSize()}` : "",
      this.spacing() === "default" ? "" : `viking-grid--${this.spacing()}`,
      "viking-grid--equal-rows",
    ]
      .filter(Boolean)
      .join(" "),
  );
}

/** Responsive item for the 12-column Viking grid. Mobile defaults to full width. */
@Component({
  selector: "viking-grid-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[class]": "hostClass()" },
  template: `<ng-content />`,
})
export class VikingGridItem {
  readonly span = input<VikingGridSpan>(12);
  readonly tabletSpan = input<VikingGridSpan | null>(null);
  readonly desktopSpan = input<VikingGridSpan | null>(null);

  protected readonly hostClass = computed(() =>
    [
      "viking-grid-item",
      `viking-grid-item--span-${this.span()}`,
      this.tabletSpan() ? `viking-grid-item--span-md-${this.tabletSpan()}` : "",
      this.desktopSpan()
        ? `viking-grid-item--span-lg-${this.desktopSpan()}`
        : "",
    ]
      .filter(Boolean)
      .join(" "),
  );
}

/** Balanced Cloudscape-style columns for cards, forms, and dashboard regions. */
@Component({
  selector: "viking-column-layout",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[class]": "hostClass()" },
  template: `<ng-content />`,
})
export class VikingColumnLayout {
  readonly columns = input<VikingColumnLayoutColumns>(2);
  readonly itemSize = input<VikingIntrinsicItemSize>("default");
  readonly spacing =
    input<Extract<VikingLayoutDensity, "tight" | "default" | "loose">>(
      "default",
    );
  readonly equalRows = input<boolean>(true);

  protected readonly hostClass = computed(() =>
    [
      "viking-column-layout",
      `viking-column-layout--${this.columns()}`,
      this.columns() === "auto"
        ? `viking-column-layout--item-${this.itemSize()}`
        : "",
      this.spacing() === "default"
        ? ""
        : `viking-column-layout--${this.spacing()}`,
      this.equalRows() ? "viking-column-layout--equal-rows" : "",
    ]
      .filter(Boolean)
      .join(" "),
  );
}

/** Top-aligned responsive field recipe for labels and helper copy of any length. */
@Component({
  selector: "viking-form-grid",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[class]": "hostClass()" },
  template: `<ng-content />`,
})
export class VikingFormGrid {
  readonly columns = input<VikingFormGridColumns>("auto");
  readonly itemSize = input<VikingIntrinsicItemSize>("default");
  readonly spacing =
    input<Extract<VikingLayoutDensity, "tight" | "default" | "loose">>(
      "default",
    );

  protected readonly hostClass = computed(() =>
    [
      "viking-column-layout",
      "viking-form-grid",
      `viking-column-layout--${this.columns()}`,
      this.columns() === "auto"
        ? `viking-column-layout--item-${this.itemSize()}`
        : "",
      this.spacing() === "default"
        ? ""
        : `viking-column-layout--${this.spacing()}`,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

/**
 * Intrinsic row-to-column layout that wraps from available space, not a
 * device-name breakpoint. Useful for toolbars, card groups, and form regions.
 */
@Component({
  selector: "viking-switcher",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[class]": "hostClass()" },
  template: `<ng-content />`,
})
export class VikingSwitcher {
  readonly itemSize = input<VikingIntrinsicItemSize>("default");
  readonly spacing =
    input<Extract<VikingLayoutDensity, "tight" | "default" | "loose">>(
      "default",
    );

  protected readonly hostClass = computed(() =>
    [
      "viking-switcher",
      `viking-switcher--${this.itemSize()}`,
      this.spacing() === "default" ? "" : `viking-switcher--${this.spacing()}`,
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
