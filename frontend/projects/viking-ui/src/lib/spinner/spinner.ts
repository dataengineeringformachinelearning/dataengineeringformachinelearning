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
    <svg viewBox="0 0 24 24" [attr.width]="size()" [attr.height]="size()" aria-hidden="true">
      <circle class="viking-spinner-track" cx="12" cy="12" r="9" fill="none" stroke-width="2.5" />
      <circle
        class="viking-spinner-arc"
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke-width="2.5"
        stroke-linecap="round"
      />
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        color: var(--viking-accent);
      }
      .viking-spinner-track {
        stroke: color-mix(in srgb, var(--viking-accent) 14%, transparent);
      }
      .viking-spinner-arc {
        stroke: currentColor;
        stroke-dasharray: 42 84;
        transform-origin: center;
        animation: viking-spin 0.75s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      }
      @keyframes viking-spin {
        to {
          transform: rotate(360deg);
        }
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
