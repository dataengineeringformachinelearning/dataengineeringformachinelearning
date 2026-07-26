import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import type { VikingTone } from "../../core/types";

export type VikingStreamStatusPhase =
  | "idle"
  | "connecting"
  | "updating"
  | "paused"
  | "delayed"
  | "offline";

/**
 * viking-stream-status — calm near-real-time indicator (never claims "Live").
 * Chrome: suite-components.css (`.suite-stream-status` / triple prefixes).
 * Pulse only when ``pulse`` is true (connected + receiving ticks).
 */
@Component({
  selector: "viking-stream-status",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: "status",
    class: "suite-stream-status viking-stream-status",
    "[attr.data-phase]": "phase()",
    "[attr.data-tone]": "tone()",
    "[attr.aria-label]": "ariaLabel() || label()",
  },
  template: `
    <span
      class="suite-stream-status__dot viking-stream-status__dot badge-dot"
      [class.pulse-dot]="pulse()"
      aria-hidden="true"
    ></span>
    <span class="suite-stream-status__label viking-stream-status__label">{{
      label()
    }}</span>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        gap: var(--viking-space-1);
        box-sizing: border-box;
      }
    `,
  ],
})
export class VikingStreamStatus {
  readonly phase = input<VikingStreamStatusPhase>("connecting");
  readonly label = input<string>("Connecting");
  readonly tone = input<VikingTone>("muted");
  readonly pulse = input<boolean>(false);
  readonly ariaLabel = input<string>("");
}
