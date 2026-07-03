import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * viking-menubar — horizontal application menu bar.
 */
@Component({
  selector: 'viking-menubar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'menubar',
    class: 'viking-menubar',
  },
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--viking-space-1);
        padding: var(--viking-space-1);
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius);
        background: var(--viking-surface);
        font-family: var(--viking-font-family);
      }
      :host ::ng-deep .viking-menubar-item,
      :host ::ng-deep button[role='menuitem'] {
        font-size: var(--viking-font-size-ui);
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: var(--viking-space-1);
        min-height: var(--viking-control-height-sm);
        padding: 0 var(--viking-space-2);
        border: 1px solid transparent;
        border-radius: var(--viking-radius);
        background: transparent;
        color: var(--viking-text);
        cursor: pointer;
        transition: var(--viking-transition);
      }
      :host ::ng-deep .viking-menubar-item:hover,
      :host ::ng-deep button[role='menuitem']:hover {
        background: var(--viking-accent-soft);
        color: var(--viking-accent);
      }
      :host ::ng-deep .viking-menubar-item:focus-visible,
      :host ::ng-deep button[role='menuitem']:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
    `,
  ],
})
export class VikingMenubar {}

/**
 * viking-menubar-item — menu item trigger for viking-menubar.
 */
@Component({
  selector: 'viking-menubar-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" role="menuitem" class="viking-menubar-item">
      <ng-content />
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
    `,
  ],
})
export class VikingMenubarItem {}
