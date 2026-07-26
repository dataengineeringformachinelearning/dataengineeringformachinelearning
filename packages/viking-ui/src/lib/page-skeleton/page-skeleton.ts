import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { VikingCard } from "../card/card";
import { VikingSkeleton } from "../skeleton/skeleton";

export type VikingPageSkeletonLayout =
  | "dashboard"
  | "cards"
  | "list"
  | "form"
  | "nav";

/**
 * viking-page-skeleton — progressive loading shell so routes never feel blank.
 * Layouts mirror dense dashboard, card grids, list panels, forms, and nav rows.
 */
@Component({
  selector: "viking-page-skeleton",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VikingCard, VikingSkeleton],
  host: {
    class: "suite-page-skeleton viking-page-skeleton",
    role: "status",
    "aria-busy": "true",
    "[attr.aria-label]": "label()",
    "[attr.data-layout]": "layout()",
  },
  template: `
    @switch (layout()) {
      @case ("dashboard") {
        <div class="suite-page-skeleton__metrics">
          <viking-card [loading]="true" [compact]="true" />
          <viking-card [loading]="true" [compact]="true" />
        </div>
        <div class="suite-page-skeleton__charts">
          <div class="suite-skeleton-stack" aria-hidden="true">
            <viking-skeleton shape="rect" height="12rem" />
            <viking-skeleton width="55%" />
            <viking-skeleton width="40%" />
          </div>
          <div class="suite-skeleton-stack" aria-hidden="true">
            <viking-skeleton shape="rect" height="12rem" />
            <viking-skeleton width="62%" />
            <viking-skeleton width="36%" />
          </div>
        </div>
      }
      @case ("cards") {
        <div class="suite-page-skeleton__cards">
          @for (_ of cardSlots; track $index) {
            <div class="suite-skeleton-stack" aria-hidden="true">
              <viking-skeleton
                width="48%"
                height="var(--viking-font-size-lg)"
              />
              <viking-skeleton width="90%" />
              <viking-skeleton width="70%" />
              <viking-skeleton shape="rect" height="3rem" />
            </div>
          }
        </div>
      }
      @case ("list") {
        <div
          class="suite-skeleton-stack suite-page-skeleton__list"
          aria-hidden="true"
        >
          @for (_ of listSlots; track $index) {
            <viking-skeleton shape="rect" height="4.5rem" />
          }
        </div>
      }
      @case ("form") {
        <div
          class="suite-skeleton-stack suite-page-skeleton__form"
          aria-hidden="true"
        >
          <viking-skeleton width="40%" height="var(--viking-font-size-lg)" />
          <viking-skeleton shape="rect" height="2.75rem" />
          <viking-skeleton shape="rect" height="2.75rem" />
          <viking-skeleton shape="rect" height="6rem" />
          <viking-skeleton width="8rem" height="2.75rem" />
        </div>
      }
      @case ("nav") {
        <div class="suite-page-skeleton__nav" aria-hidden="true">
          @for (_ of navSlots; track $index) {
            <viking-skeleton width="72%" height="var(--viking-space-3)" />
          }
        </div>
      }
    }
  `,
})
export class VikingPageSkeleton {
  readonly layout = input<VikingPageSkeletonLayout>("dashboard");
  readonly label = input("Loading");

  protected readonly cardSlots = [0, 1, 2];
  protected readonly listSlots = [0, 1, 2, 3, 4];
  protected readonly navSlots = [0, 1, 2, 3, 4, 5];
}
