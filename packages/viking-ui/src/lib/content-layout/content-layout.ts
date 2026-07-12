import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";

export type VikingContentLayoutType =
  | "dashboard"
  | "resource"
  | "collection"
  | "form"
  | "wizard"
  | "documentation";
export type VikingContentLayoutWidth = "readable" | "default" | "wide" | "full";
export type VikingContentLayoutDensity = "compact" | "default" | "loose";

/** Route-owned page interior with predictable breadcrumb, notification, header, and body regions. */
@Component({
  selector: "viking-content-layout",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[class]": "hostClass()" },
  template: `
    <div class="viking-content-layout__inner">
      <div class="viking-content-layout__breadcrumbs">
        <ng-content select="[vikingContentBreadcrumbs]" />
      </div>
      <div class="viking-content-layout__notifications">
        <ng-content select="[vikingContentNotifications]" />
      </div>
      <header class="viking-content-layout__header">
        <div class="viking-content-layout__heading">
          <ng-content select="[vikingContentHeader]" />
        </div>
        <div class="viking-content-layout__actions">
          <ng-content select="[vikingContentActions]" />
        </div>
      </header>
      <main class="viking-content-layout__body"><ng-content /></main>
      <footer class="viking-content-layout__footer">
        <ng-content select="[vikingContentFooter]" />
      </footer>
    </div>
  `,
})
export class VikingContentLayout {
  readonly type = input<VikingContentLayoutType>("resource");
  readonly width = input<VikingContentLayoutWidth>("default");
  readonly density = input<VikingContentLayoutDensity>("default");
  readonly headerVariant = input<"default" | "high-contrast">("default");

  protected readonly hostClass = computed(() =>
    [
      "viking-content-layout",
      `viking-content-layout--${this.type()}`,
      `viking-content-layout--${this.width()}`,
      `viking-content-layout--${this.density()}`,
      `viking-content-layout--header-${this.headerVariant()}`,
    ].join(" "),
  );
}
