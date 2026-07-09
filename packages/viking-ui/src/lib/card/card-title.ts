import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { VikingIconBadge, VikingIconBadgeTone } from "../icon-badge/icon-badge";
import { VikingIconName } from "../../core/icons";
import { VikingHeading } from "../typography/heading";

/**
 * viking-card-title — card header title row with tokenized icon badge + heading.
 * Compose inside viking-card-header for premium, consistent section titles.
 */
@Component({
  selector: "viking-card-title",
  imports: [VikingIconBadge, VikingHeading],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "viking-card-title" },
  template: `
    <viking-icon-badge [icon]="icon()" [tone]="tone()" [size]="iconSize()" />
    <viking-heading [level]="level()" [size]="size()">
      <ng-content />
    </viking-heading>
  `,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        gap: var(--viking-space-2);
        flex: 1 1 auto;
        min-width: 0;
        margin: 0;
      }

      :host ::ng-deep viking-icon-badge {
        align-self: center;
        flex-shrink: 0;
      }

      :host ::ng-deep viking-heading {
        display: flex;
        align-items: center;
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin: 0 !important;
        padding: 0;
        line-height: 1.25;
        font-size: var(--viking-font-size-lg);
        font-weight: var(--viking-font-weight-bold);
        letter-spacing: var(--viking-letter-spacing-tight);
        text-transform: none;
      }
    `,
  ],
})
export class VikingCardTitle {
  readonly icon = input.required<VikingIconName>();
  readonly tone = input<VikingIconBadgeTone>("default");
  readonly level = input<1 | 2 | 3 | 4>(2);
  /** Card section titles stay compact — marketing display uses viking-font-display. */
  readonly size = input<"sm" | "base" | "lg" | "xl">("lg");
  readonly iconSize = input<number>(20);
}
