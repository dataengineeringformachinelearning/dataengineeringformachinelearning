import { ChangeDetectionStrategy, Component, InjectionToken, model } from '@angular/core';

export const VIKING_TABS = new InjectionToken<VikingTabs>('VIKING_TABS');

/**
 * viking-tabs — tablist container.
 */
@Component({
  selector: 'viking-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: VIKING_TABS, useExisting: VikingTabs }],
  host: { class: 'viking-tabs' },
  template: `
    <div class="viking-tabs-list" role="tablist">
      <ng-content select="viking-tab" />
    </div>
    <ng-content select="viking-tab-panel" />
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-2);
        font-family: var(--viking-font-family);
      }
      .viking-tabs-list {
        display: flex;
        flex-wrap: wrap;
        gap: var(--viking-space-1);
        padding: var(--viking-space-1);
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius);
        background: var(--viking-surface-alt);
      }
    `,
  ],
})
export class VikingTabs {
  readonly value = model<string>('');
}
