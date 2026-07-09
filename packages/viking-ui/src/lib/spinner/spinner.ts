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
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        color: var(--viking-accent);
        line-height: 0;
      }

      .viking-spinner-svg {
        --viking-spinner-stroke: 2;
        display: block;
        shape-rendering: geometricPrecision;
        /* Rotate the whole glyph about its center — not the arc alone (which orbits). */
        transform-origin: 50% 50%;
        transform-box: fill-box;
        animation: viking-spin var(--viking-duration-slow) linear infinite;
      }

      .viking-spinner-track,
      .viking-spinner-arc {
        fill: none;
        stroke-width: var(--viking-spinner-stroke);
      }

      .viking-spinner-track {
        stroke: color-mix(in srgb, currentColor 14%, transparent);
      }

      .viking-spinner-arc {
        stroke: currentColor;
        stroke-dasharray: 42 84;
      }

      @media (prefers-reduced-motion: reduce) {
        .viking-spinner-svg {
          animation: none;
        }
        .viking-spinner-arc {
          stroke-dasharray: 56 84;
        }
      }

      @keyframes viking-spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class VikingSpinner {
  readonly size = input<number>(20);
  readonly label = input<string>("Loading");
}
