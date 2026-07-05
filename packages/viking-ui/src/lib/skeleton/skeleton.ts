import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/**
 * viking-skeleton — loading placeholder.
 */
@Component({
  selector: "viking-skeleton",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "aria-hidden": "true",
    "[class.viking-skeleton-circle]": "shape() === 'circle'",
    "[style.width]": "width()",
    "[style.height]": "height()",
  },
  template: ``,
  styles: [
    `
      :host {
        display: block;
        border-radius: var(--viking-radius-sm);
        background: linear-gradient(
          100deg,
          var(--viking-surface-alt) 38%,
          color-mix(
              in srgb,
              var(--viking-text-muted) 10%,
              var(--viking-surface-alt)
            )
            50%,
          var(--viking-surface-alt) 62%
        );
        background-size: 200% 100%;
        animation: viking-shimmer 1.6s ease-in-out infinite;
      }
      :host(.viking-skeleton-circle) {
        border-radius: var(--viking-radius-pill);
      }
      @media (prefers-reduced-motion: reduce) {
        :host {
          animation: none;
          background: var(--viking-surface-alt);
        }
      }
    `,
  ],
})
export class VikingSkeleton {
  readonly shape = input<"line" | "rect" | "circle">("line");
  readonly width = input<string>("100%");
  readonly height = input<string>("var(--viking-font-size-sm)");
}
