import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { VikingSpinner } from '../spinner/spinner';

/**
 * viking-loading-overlay — blocks interaction with a centered spinner.
 * Use on cards, panels, or full-page surfaces during async operations.
 */
@Component({
  selector: 'viking-loading-overlay',
  imports: [VikingSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'status',
    'aria-live': 'polite',
    '[attr.aria-label]': 'label()',
    '[class.viking-loading-overlay-full]': 'full()',
  },
  template: `
    <div class="viking-loading-overlay-backdrop" aria-hidden="true"></div>
    <div class="viking-loading-overlay-content">
      <viking-spinner [size]="spinnerSize()" [label]="label()" />
      @if (message()) {
        <p class="viking-loading-overlay-message">{{ message() }}</p>
      }
    </div>
  `,
  styles: [
    `
      :host {
        position: absolute;
        inset: 0;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: inherit;
        animation: viking-fade-in var(--viking-duration-fast) var(--viking-ease-out);
      }
      :host(.viking-loading-overlay-full) {
        position: fixed;
        z-index: var(--viking-z-overlay);
        border-radius: 0;
      }
      .viking-loading-overlay-backdrop {
        position: absolute;
        inset: 0;
        background: color-mix(in srgb, var(--viking-bg) 55%, transparent);
        backdrop-filter: blur(2px);
        border-radius: inherit;
      }
      .viking-loading-overlay-content {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--viking-space-1);
        padding: var(--viking-space-2);
      }
      .viking-loading-overlay-message {
        margin: 0;
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-sm);
        color: var(--viking-text-muted);
        text-align: center;
      }
      @media (prefers-reduced-motion: reduce) {
        :host {
          animation: none;
        }
      }
    `,
  ],
})
export class VikingLoadingOverlay {
  readonly label = input<string>('Loading');
  readonly message = input<string>('');
  readonly spinnerSize = input<number>(28);
  readonly full = input<boolean>(false);
}
