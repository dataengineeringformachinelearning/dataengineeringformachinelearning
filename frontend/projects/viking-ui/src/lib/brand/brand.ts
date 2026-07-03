import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * viking-brand — logo + wordmark lockup.
 * Project a custom logo (img/svg) or fall back to a monogram tile.
 */
@Component({
  selector: 'viking-brand',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (logoSrc()) {
      <img class="viking-brand-logo" [src]="logoSrc()" [alt]="name() + ' logo'" />
    } @else {
      <span class="viking-brand-mark" aria-hidden="true">{{ name().charAt(0) }}</span>
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
      .viking-brand-mark {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--viking-space-3);
        height: var(--viking-space-3);
        border-radius: var(--viking-radius);
        background: var(--viking-accent);
        color: var(--viking-accent-content);
        font-weight: 700;
        font-size: var(--viking-font-size-ui);
        text-transform: uppercase;
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
