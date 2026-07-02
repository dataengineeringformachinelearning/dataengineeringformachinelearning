import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * flux-brand — logo + wordmark lockup (https://fluxui.dev/components/brand).
 * Project a custom logo (img/svg) or fall back to a monogram tile.
 */
@Component({
  selector: 'flux-brand',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (logoSrc()) {
      <img class="flux-brand-logo" [src]="logoSrc()" [alt]="name() + ' logo'" />
    } @else {
      <span class="flux-brand-mark" aria-hidden="true">{{ name().charAt(0) }}</span>
    }
    <span class="flux-brand-name">{{ name() }}</span>
    <ng-content />
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        gap: var(--flux-space-1);
        font-family: var(--flux-font-family);
        color: var(--flux-text);
        text-decoration: none;
      }
      .flux-brand-logo {
        height: var(--flux-space-3);
        width: auto;
      }
      .flux-brand-mark {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--flux-space-3);
        height: var(--flux-space-3);
        border-radius: var(--flux-radius);
        background: var(--flux-accent);
        color: var(--flux-accent-content);
        font-weight: 700;
        font-size: var(--flux-font-size);
        text-transform: uppercase;
      }
      .flux-brand-name {
        font-weight: 700;
        font-size: var(--flux-font-size-lg);
        letter-spacing: var(--header-letter-spacing, -0.02em);
        white-space: nowrap;
      }
    `,
  ],
})
export class FluxBrand {
  readonly name = input.required<string>();
  readonly logoSrc = input<string | null>(null);
}
