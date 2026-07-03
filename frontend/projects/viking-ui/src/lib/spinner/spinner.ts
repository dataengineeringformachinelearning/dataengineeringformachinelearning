import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * viking-spinner — clinical loading indicator.
 */
@Component({
  selector: 'viking-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'status',
    'aria-live': 'polite',
    '[attr.aria-label]': 'label()',
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
      <circle class="viking-spinner-arc" cx="12" cy="12" r="9" stroke-linecap="round" />
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        color: var(--viking-accent);
      }

      .viking-spinner-svg {
        --viking-spinner-stroke: 2;
        shape-rendering: geometricPrecision;
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
        transform-origin: center;
        animation: viking-spin var(--viking-duration-slow) var(--viking-ease-default) infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        .viking-spinner-arc {
          animation: none;
          stroke-dasharray: 56 84;
        }
      }
    `,
  ],
})
export class VikingSpinner {
  readonly size = input<number>(20);
  readonly label = input<string>('Loading');
}
