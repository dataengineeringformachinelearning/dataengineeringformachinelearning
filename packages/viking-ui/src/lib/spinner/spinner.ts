import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/**
 * viking-spinner — clinical loading indicator.
 */
@Component({
  selector: "viking-spinner",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: "status",
    "aria-live": "polite",
    "[attr.aria-label]": "label()",
    "[class.viking-spinner-branded]": "branded()",
  },
  template: `
    <svg
      class="viking-spinner-svg"
      viewBox="0 0 24 24"
      fill="none"
      [attr.width]="size()"
      [attr.height]="size()"
      aria-hidden="true"
    >
      <circle class="viking-spinner-track" cx="12" cy="12" r="9" />
      <circle
        class="viking-spinner-arc"
        cx="12"
        cy="12"
        r="9"
        stroke-linecap="round"
      />
    </svg>
    @if (branded()) {
      <span class="viking-spinner-wordmark" aria-hidden="true">DEML</span>
    }
  `,
})
export class VikingSpinner {
  readonly size = input<number>(20);
  readonly label = input<string>("Loading");
  readonly branded = input<boolean>(false);
}
