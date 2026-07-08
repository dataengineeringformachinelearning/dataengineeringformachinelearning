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
        border-radius: var(--viking-radius-lg); /* More polished rounding */
        box-shadow: var(--viking-shadow-sm);
        overflow: hidden;
        gap: 1px; /* Subtle separation for modern grouped buttons */
        background: var(--viking-border-subtle);
      }
      :host ::ng-deep viking-button .viking-btn {
        box-shadow: none;
        min-width: 0;
        border-radius: 0; /* Fused look */
      }
      :host ::ng-deep viking-button:first-child .viking-btn {
        border-top-left-radius: var(--viking-radius-lg);
        border-bottom-left-radius: var(--viking-radius-lg);
      }
      :host ::ng-deep viking-button:last-child .viking-btn {
        border-top-right-radius: var(--viking-radius-lg);
        border-bottom-right-radius: var(--viking-radius-lg);
      }
      :host ::ng-deep viking-button .viking-btn:hover,
      :host ::ng-deep viking-button .viking-btn:focus-visible {
        z-index: 1;
        position: relative;
      }
    `,
  ],
})
export class VikingButtonGroup {}
