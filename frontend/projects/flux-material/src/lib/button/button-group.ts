import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * flux-button-group — fuses buttons with shared borders
 * (https://fluxui.dev/components/button#button-groups).
 */
@Component({
  selector: 'flux-button-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'group' },
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: inline-flex;
        border-radius: var(--flux-radius);
        box-shadow: var(--flux-shadow-sm);
      }
      :host ::ng-deep flux-button:not(:first-child) .flux-btn {
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        margin-left: -1px;
      }
      :host ::ng-deep flux-button:not(:last-child) .flux-btn {
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
      }
      :host ::ng-deep flux-button .flux-btn {
        box-shadow: none;
      }
    `,
  ],
})
export class FluxButtonGroup {}
