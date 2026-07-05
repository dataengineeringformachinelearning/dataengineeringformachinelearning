import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  input,
} from "@angular/core";
import { VikingIcon } from "../icon/icon";
import { VikingIconName } from "../../core/icons";

/**
 * viking-icon-heading — icon + title row with shared vertical alignment.
 * Use in bento cards, integration tiles, and docs panels.
 */
@Component({
  selector: "viking-icon-heading",
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [VikingIcon],
  host: {
    class: "viking-icon-heading",
    "[class.viking-icon-heading--lg]": 'size() === "lg"',
  },
  template: `
    <span class="viking-icon-heading__icon" aria-hidden="true">
      <viking-icon [name]="icon()" [size]="24" color="accent" />
    </span>
    @if (headingLevel() === "h2") {
      <h2 class="viking-icon-heading__title"><ng-content /></h2>
    } @else {
      <h3 class="viking-icon-heading__title"><ng-content /></h3>
    }
  `,
})
export class VikingIconHeading {
  readonly icon = input.required<VikingIconName>();
  readonly size = input<"md" | "lg">("md");
  readonly headingLevel = input<"h2" | "h3">("h3");
}
