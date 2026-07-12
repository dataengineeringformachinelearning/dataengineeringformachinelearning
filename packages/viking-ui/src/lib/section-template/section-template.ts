import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import { VikingIconComponent } from "../icon/icon";

export type VikingSectionTemplateLayout = "grid" | "stack";

/** Section anatomy with a consistent title, description, actions, and body rhythm. */
@Component({
  selector: "viking-section-template",
  standalone: true,
  imports: [VikingIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[class]": "hostClass()" },
  template: `
    @if (!hideHeader()) {
      <header class="viking-section__header">
        @if (icon()) {
          <viking-icon
            class="viking-section__icon"
            [name]="icon()!"
            [size]="20"
            [ariaHidden]="true"
          />
        }
        <div class="viking-section__heading-group">
          <h2 class="viking-section__title">{{ heading() }}</h2>
          @if (description()) {
            <p class="viking-section__description">{{ description() }}</p>
          }
        </div>
        <div class="viking-section__actions">
          <ng-content select="[vikingSectionActions]" />
        </div>
      </header>
    }
    @if (showDivider()) {
      <div
        class="viking-section__divider"
        role="separator"
        aria-hidden="true"
      ></div>
    }
    <div class="viking-section__body"><ng-content /></div>
  `,
})
export class VikingSectionTemplate {
  readonly heading = input<string>("");
  readonly icon = input<string | null>(null);
  readonly description = input<string | null>(null);
  readonly variant = input<"default" | "large">("default");
  readonly layout = input<VikingSectionTemplateLayout>("stack");
  readonly showDivider = input<boolean>(false);
  readonly hideHeader = input<boolean>(false);

  protected readonly hostClass = computed(() =>
    [
      "viking-section-template",
      `viking-section--${this.layout()}`,
      this.variant() === "default" ? "" : `viking-section--${this.variant()}`,
    ]
      .filter(Boolean)
      .join(" "),
  );
}
