import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * flux-skeleton — loading placeholder (https://fluxui.dev/components/skeleton).
 */
@Component({
  selector: 'flux-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[class.flux-skeleton-circle]': "shape() === 'circle'",
    '[style.width]': 'width()',
    '[style.height]': 'height()',
  },
  template: ``,
  styles: [
    `
      :host {
        display: block;
        border-radius: var(--flux-radius);
        background: linear-gradient(
          100deg,
          var(--flux-surface-alt) 40%,
          color-mix(in srgb, var(--flux-text-muted) 14%, var(--flux-surface-alt)) 50%,
          var(--flux-surface-alt) 60%
        );
        background-size: 200% 100%;
        animation: flux-skeleton-shimmer 1.4s ease-in-out infinite;
      }
      :host(.flux-skeleton-circle) {
        border-radius: var(--flux-radius-pill);
      }
      @keyframes flux-skeleton-shimmer {
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
export class FluxSkeleton {
  readonly shape = input<'line' | 'rect' | 'circle'>('line');
  readonly width = input<string>('100%');
  readonly height = input<string>('18px');
}
