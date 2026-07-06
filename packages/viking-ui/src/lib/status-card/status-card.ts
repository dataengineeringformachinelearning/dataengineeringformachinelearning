import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
} from "@angular/core";
import { registerVikingElements } from "../../web/index";
import type { VikingTone } from "../../core/types";

registerVikingElements();

/**
 * viking-status-card — wrapper around the web component.
 */
@Component({
  selector: "viking-status-card",
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <viking-status-card-wc
      [attr.title]="title()"
      [attr.subtitle]="subtitle()"
      [attr.status]="status()"
      [attr.status-tone]="statusTone()"
      [attr.status-dot]="statusDot() || null"
      [attr.href]="href()"
      [attr.target]="target()"
      [attr.compact]="compact() || null"
      [attr.loading]="loading() || null"
      [attr.interactive]="interactive() || null"
      [attr.aria-label]="ariaLabel()"
    >
      <ng-content />
    </viking-status-card-wc>
  `,
})
export class VikingStatusCard {
  readonly title = input<string>("");
  readonly subtitle = input<string>("");
  readonly status = input<string>("");
  readonly statusTone = input<VikingTone>("muted");
  readonly statusDot = input<boolean>(false);
  readonly href = input<string>("");
  readonly target = input<string>("");
  readonly compact = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly interactive = input<boolean>(false);
  readonly ariaLabel = input<string>("");
}
