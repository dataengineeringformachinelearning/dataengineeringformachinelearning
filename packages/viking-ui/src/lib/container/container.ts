import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import { VikingIconComponent } from "../icon/icon";

export type VikingContainerVariant = "surface" | "inset" | "transparent";
export type VikingContainerPadding = "compact" | "default" | "none";

/** Cloudscape-style content container with one deterministic anatomy. */
@Component({
  selector: "viking-container",
  standalone: true,
  imports: [VikingIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[class]": "hostClass()" },
  template: `
    @if (heading() || description() || icon()) {
      <header class="viking-container__header">
        @if (icon()) {
          <viking-icon
            class="viking-container__icon"
            [name]="icon()!"
            [size]="20"
            [ariaHidden]="true"
          />
        }
        <div class="viking-container__heading-group">
          @if (heading()) {
            <h2 class="viking-container__title">{{ heading() }}</h2>
          }
          @if (description()) {
            <p class="viking-container__description">{{ description() }}</p>
          }
        </div>
        <div class="viking-container__actions">
          <ng-content select="[vikingContainerActions]" />
        </div>
      </header>
    }
    <div class="viking-container__body"><ng-content /></div>
    <ng-content select="[vikingContainerFooter]" />
  `,
})
export class VikingContainer {
  readonly heading = input<string>("");
  readonly description = input<string | null>(null);
  readonly icon = input<string | null>(null);
  readonly variant = input<VikingContainerVariant>("surface");
  readonly padding = input<VikingContainerPadding>("default");

  protected readonly hostClass = computed(() =>
    [
      "viking-container",
      `viking-container--${this.variant()}`,
      `viking-container--padding-${this.padding()}`,
    ].join(" "),
  );
}
