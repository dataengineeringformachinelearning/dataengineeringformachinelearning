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
        gap: var(--viking-space-2); /* Better breathing with icon + heading */
        flex: 1 1 auto;
        min-width: 0;
        margin: 0;
      }

      :host ::ng-deep viking-heading {
        display: block;
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin: 0;
      }
    `,
  ],
})
export class VikingCardTitle {
  readonly icon = input.required<VikingIconName>();
  readonly tone = input<VikingIconBadgeTone>("default");
  readonly level = input<1 | 2 | 3 | 4>(2);
  readonly size = input<"sm" | "base" | "lg" | "xl">("xl");
  readonly iconSize = input<number>(20);
}
