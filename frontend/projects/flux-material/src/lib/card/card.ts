import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * flux-card — surface container (https://fluxui.dev/components/card).
 * Compose with flux-card-header / flux-card-footer for structured layouts.
 */
@Component({
  selector: 'flux-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.flux-card-interactive]': 'interactive()' },
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: block;
        background: var(--flux-surface);
        border: 1px solid var(--flux-border);
        border-radius: var(--flux-radius-lg);
        box-shadow: var(--flux-shadow-sm);
        padding: var(--flux-space-3);
        color: var(--flux-text);
        transition: var(--flux-transition);
      }
      :host(.flux-card-interactive):hover {
        border-color: var(--flux-accent-strong);
        box-shadow: var(--flux-shadow-md);
        transform: translateY(-2px);
      }
    `,
  ],
})
export class FluxCard {
  readonly interactive = input<boolean>(false);
}

/** Header row for flux-card. */
@Component({
  selector: 'flux-card-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--flux-space-2);
        padding-bottom: var(--flux-space-2);
        margin-bottom: var(--flux-space-2);
        border-bottom: 1px solid var(--flux-border);
      }
    `,
  ],
})
export class FluxCardHeader {}

/** Footer row for flux-card. */
@Component({
  selector: 'flux-card-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        gap: var(--flux-space-1);
        padding-top: var(--flux-space-2);
        margin-top: var(--flux-space-2);
        border-top: 1px solid var(--flux-border);
      }
    `,
  ],
})
export class FluxCardFooter {}
