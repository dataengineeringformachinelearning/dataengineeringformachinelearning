import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { VikingIcon } from "../icon/icon";
import { VikingIconName } from "../../core/icons";

/**
 * viking-empty-state — zero-data placeholder with helpful hierarchy.
 * Chrome from suite-empty (Pass 1); actions via projected content.
 */
@Component({
  selector: "viking-empty-state",
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: "status",
    class: "suite-empty viking-empty",
    "[attr.data-density]": "density()",
    "[attr.data-variant]": "variant()",
  },
  template: `
    @if (icon()) {
      <div class="suite-empty-icon viking-empty-icon" aria-hidden="true">
        <viking-icon [name]="icon()!" [size]="iconSize()" />
      </div>
    }
    @if (eyebrow()) {
      <p class="suite-empty-eyebrow viking-empty-eyebrow">{{ eyebrow() }}</p>
    }
    @if (heading()) {
      <p class="suite-empty-title viking-empty-title">{{ heading() }}</p>
    }
    @if (description()) {
      <p class="suite-empty-description viking-empty-description">
        {{ description() }}
      </p>
    }
    @if (hint()) {
      <p class="suite-empty-hint viking-empty-hint">{{ hint() }}</p>
    }
    <div class="suite-empty-actions viking-empty-actions">
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
export class VikingEmptyState {
  readonly heading = input<string>("No data yet");
  readonly description = input<string>(
    "When results arrive, they will show up here.",
  );
  readonly hint = input<string>("");
  readonly eyebrow = input<string>("");
  readonly icon = input<VikingIconName | null>("folder");
  readonly iconSize = input<number>(24);
  readonly density = input<"default" | "compact">("default");
  readonly variant = input<"default" | "inset">("default");
}
