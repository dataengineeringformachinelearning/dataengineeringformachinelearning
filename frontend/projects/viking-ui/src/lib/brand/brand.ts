import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { VikingIcon } from '../icon/icon';

/**
 * viking-brand — logo + wordmark lockup.
 * Project a custom logo (img/svg) or fall back to a monogram tile.
 */
@Component({
  selector: 'viking-brand',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [VikingIcon],
  template: `
    @if (logoSrc()) {
      <img class="viking-brand-logo" [src]="logoSrc()" [alt]="name() + ' logo'" />
    } @else {
      <viking-icon name="drakkar" [size]="28" color="accent" class="viking-brand-mark-icon" />
    }
    <span class="viking-brand-name">{{ name() }}</span>
    <ng-content />
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        gap: var(--viking-space-1);
        font-family: var(--viking-font-family);
        color: var(--viking-text);
        text-decoration: none;
      }
      .viking-brand-logo {
        height: var(--viking-space-3);
        width: auto;
      }
      .viking-brand-mark-icon {
        color: var(--viking-accent);
        flex-shrink: 0;
      }
      .viking-brand-name {
        font-weight: 700;
        font-size: var(--viking-font-size-ui);
        letter-spacing: var(--header-letter-spacing, -0.02em);
        white-space: nowrap;
      }
    `,
  ],
})
export class VikingBrand {
  readonly name = input.required<string>();
  readonly logoSrc = input<string | null>(null);
}
