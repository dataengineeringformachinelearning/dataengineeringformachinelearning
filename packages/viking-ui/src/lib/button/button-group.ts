import { ChangeDetectionStrategy, Component } from "@angular/core";

/**
 * viking-button-group — fuses buttons with shared borders
 *.
 */
@Component({
  selector: "viking-button-group",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: "group" },
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: inline-flex;
        border-radius: var(--viking-radius);
        box-shadow: var(--viking-shadow-sm);
        overflow: hidden;
      }
      :host ::ng-deep viking-button:not(:first-child) .viking-btn {
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
        margin-left: -1px;
      }
      :host ::ng-deep viking-button:not(:last-child) .viking-btn {
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
      }
      :host ::ng-deep viking-button .viking-btn {
        box-shadow: none;
        min-width: 0;
      }
      :host ::ng-deep viking-button .viking-btn:hover,
      :host ::ng-deep viking-button .viking-btn:focus-visible {
        z-index: 1;
      }
    `,
  ],
})
export class VikingButtonGroup {}
