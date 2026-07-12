import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";

export type VikingBoxPadding = "none" | "compact" | "default" | "loose";
export type VikingBoxVariant = "transparent" | "surface" | "muted" | "inset";

/** Lightweight content grouping primitive for metadata, empty states, and nested regions. */
@Component({
  selector: "viking-box",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[class]": "hostClass()" },
  template: `<ng-content />`,
})
export class VikingBox {
  readonly padding = input<VikingBoxPadding>("default");
  readonly variant = input<VikingBoxVariant>("transparent");
  readonly display = input<"block" | "stack" | "cluster">("block");
  readonly textAlign = input<"start" | "center" | "end">("start");

  protected readonly hostClass = computed(
    () =>
      `viking-box viking-box--${this.variant()} viking-box--padding-${this.padding()} ` +
      `viking-box--${this.display()} viking-box--align-${this.textAlign()}`,
  );
}
