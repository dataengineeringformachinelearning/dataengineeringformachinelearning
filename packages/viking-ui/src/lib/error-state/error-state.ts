import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { VikingIcon } from "../icon/icon";
import { VikingIconName } from "../../core/icons";

/**
 * viking-error-state — recovery-oriented failure surface (not field errors).
 * Chrome from suite-error-state; retry / support actions via projection.
 */
@Component({
  selector: "viking-error-state",
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: "alert",
    class: "suite-error-state viking-error-state",
  },
  template: `
    <div
      class="suite-error-state-icon viking-error-state-icon"
      aria-hidden="true"
    >
      <viking-icon [name]="icon()" [size]="iconSize()" />
    </div>
    @if (heading()) {
      <p class="suite-error-state-title viking-error-state-title">
        {{ heading() }}
      </p>
    }
    @if (description()) {
      <p class="suite-error-state-description viking-error-state-description">
        {{ description() }}
      </p>
    }
    @if (hint()) {
      <p class="suite-error-state-hint viking-error-state-hint">{{ hint() }}</p>
    }
    <div class="suite-error-state-actions viking-error-state-actions">
      <ng-content />
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        width: 100%;
        box-sizing: border-box;
      }
    `,
  ],
})
export class VikingErrorState {
  readonly heading = input<string>("Something went wrong");
  readonly description = input<string>(
    "We could not complete that request. Try again, or contact support if it continues.",
  );
  readonly hint = input<string>("");
  readonly icon = input<VikingIconName>("alert-circle");
  readonly iconSize = input<number>(24);
}
