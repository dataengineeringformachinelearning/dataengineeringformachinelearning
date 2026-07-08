import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  output,
} from "@angular/core";
import { registerVikingStatusPillWcElement } from "../../web/status-pill/viking-status-pill-wc";
import type { VikingTone } from "../../core/types";

registerVikingStatusPillWcElement();

/**
 * viking-status-pill — status badge for status cards and operational states.
 */
@Component({
  selector: "viking-status-pill",
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <viking-status-pill-wc
      [attr.tone]="tone()"
      [attr.icon]="icon()"
      [attr.dot]="dot() || null"
      [attr.compact]="compact() || null"
      [attr.removable]="removable() || null"
      [attr.href]="href()"
      [attr.target]="target()"
      [attr.aria-label]="ariaLabel()"
      (viking-pill-removed)="removed.emit()"
    >
      <ng-content />
    </viking-status-pill-wc>
  `,
})
export class VikingStatusPill {
  readonly tone = input<VikingTone>("muted");
  readonly icon = input<string>("");
  readonly dot = input<boolean>(false);
  readonly compact = input<boolean>(false);
  readonly removable = input<boolean>(false);
  readonly href = input<string>("");
  readonly target = input<string>("");
  readonly ariaLabel = input<string>("");

  readonly removed = output<void>();
}
