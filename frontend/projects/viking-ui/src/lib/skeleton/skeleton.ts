import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * viking-skeleton — loading placeholder (https://fluxui.dev/components/skeleton).
 */
@Component({
  selector: 'viking-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[class.viking-skeleton-circle]': "shape() === 'circle'",
    '[style.width]': 'width()',
    '[style.height]': 'height()',
  },
  template: ``,
  styles: [
    `
      :host {
        display: block;
        border-radius: var(--viking-radius);
        background: linear-gradient(
          100deg,
          var(--viking-surface-alt) 40%,
          color-mix(in srgb, var(--viking-text-muted) 14%, var(--viking-surface-alt)) 50%,
          var(--viking-surface-alt) 60%
        );
        background-size: 200% 100%;
        animation: viking-skeleton-shimmer 1.4s ease-in-out infinite;
      }
      :host(.viking-skeleton-circle) {
        border-radius: var(--viking-radius-pill);
      }
      @keyframes viking-skeleton-shimmer {
        from {
          background-position: 120% 0;
        }
        to {
          background-position: -80% 0;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        :host {
          animation: none;
        }
      }
    `,
  ],
})
export class VikingSkeleton {
  readonly shape = input<'line' | 'rect' | 'circle'>('line');
  readonly width = input<string>('100%');
  readonly height = input<string>('18px');
}
