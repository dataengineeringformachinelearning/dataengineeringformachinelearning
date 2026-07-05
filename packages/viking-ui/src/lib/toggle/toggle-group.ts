import {
  ChangeDetectionStrategy,
  Component,
  InjectionToken,
  model,
} from "@angular/core";

export const VIKING_TOGGLE_GROUP = new InjectionToken<VikingToggleGroup>(
  "VIKING_TOGGLE_GROUP",
);

/**
 * viking-toggle-group — exclusive or multi toggle cluster.
 */
@Component({
  selector: "viking-toggle-group",
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: VIKING_TOGGLE_GROUP, useExisting: VikingToggleGroup }],
  host: {
    role: "group",
    class: "viking-toggle-group",
    "[class.viking-exclusive]": "exclusive()",
  },
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 0;
        border: 1px solid var(--viking-border-strong);
        border-radius: var(--viking-radius);
        overflow: hidden;
        box-shadow: var(--viking-shadow-sm);
      }
      :host ::ng-deep viking-toggle:not(:first-child) .viking-toggle {
        border-left: none;
        margin-left: -1px;
        border-radius: 0;
      }
      :host ::ng-deep viking-toggle:first-child .viking-toggle {
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
      }
      :host ::ng-deep viking-toggle:last-child .viking-toggle {
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
      }
      :host ::ng-deep viking-toggle .viking-toggle {
        min-width: var(--viking-btn-min-width, 120px);
        border-radius: 0;
        box-shadow: none;
      }
    `,
  ],
})
export class VikingToggleGroup {
  readonly value = model<string>("");
  readonly exclusive = model(true);
}
