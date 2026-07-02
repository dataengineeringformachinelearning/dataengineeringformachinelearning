import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { VIKING_TABS, VikingTabs } from './tabs';

/**
 * viking-tab-panel — tabpanel region inside viking-tabs.
 */
@Component({
  selector: 'viking-tab-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'tabpanel',
    '[attr.hidden]': 'hidden() ? "" : null',
    '[class.viking-hidden]': 'hidden()',
  },
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: block;
        padding: var(--viking-space-2);
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius);
        background: var(--viking-surface);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size);
        color: var(--viking-text);
        line-height: 1.6;
      }
      :host(.viking-hidden) {
        display: none;
      }
    `,
  ],
})
export class VikingTabPanel {
  private readonly tabs = inject(VikingTabs, { optional: true });

  readonly value = input.required<string>();

  protected hidden = () => (this.tabs?.value() ?? '') !== this.value();
}
