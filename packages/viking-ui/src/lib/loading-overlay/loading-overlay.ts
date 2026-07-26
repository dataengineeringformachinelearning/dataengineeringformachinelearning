import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { VikingSpinner } from "../spinner/spinner";

/**
 * viking-loading-overlay — blocks interaction with a branded loading panel.
 * Use on cards, panels, or full-page surfaces during async operations.
 */
@Component({
  selector: "viking-loading-overlay",
  imports: [VikingSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: "status",
    "aria-live": "polite",
    class: "suite-loading-overlay viking-loading-overlay",
    "[attr.aria-label]": "label()",
    "[class.viking-loading-overlay-full]": "full()",
  },
  template: `
    <div class="suite-loading-backdrop" aria-hidden="true"></div>
    <div class="suite-loading-panel viking-loading-panel">
      <viking-spinner [size]="spinnerSize()" [label]="label()" />
      @if (message()) {
        <p class="suite-loading-title viking-loading-title">{{ message() }}</p>
      }
      @if (detail()) {
        <p class="suite-loading-text viking-loading-text">{{ detail() }}</p>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        border-radius: inherit;
      }
      :host(.viking-loading-overlay-full) {
        position: fixed;
        z-index: var(--viking-z-overlay, var(--suite-z-overlay));
        border-radius: 0;
      }
    `,
  ],
})
export class VikingLoadingOverlay {
  readonly label = input<string>("Loading");
  /** Primary line under the spinner (short, present-tense). */
  readonly message = input<string>("Working…");
  /** Optional secondary context (what is loading). */
  readonly detail = input<string>("");
  readonly spinnerSize = input<number>(28);
  readonly full = input<boolean>(false);
}
