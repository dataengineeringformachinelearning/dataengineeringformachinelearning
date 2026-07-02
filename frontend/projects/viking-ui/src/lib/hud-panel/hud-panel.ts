import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { VikingIcon } from '../icon/icon';
import { VikingIconName } from '../core/icons';

/** viking-hud-panel — bordered dashboard panel with icon header. */
@Component({
  selector: 'viking-hud-panel',
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'viking-hud-panel panel-section',
  },
  template: `
    <div class="viking-hud-panel-header panel-header">
      @if (icon()) {
        <viking-icon [name]="icon()!" [size]="20" class="panel-icon" />
      }
      <h2 class="viking-hud-panel-title">{{ title() }}</h2>
      <ng-content select="[fluxHudPanelBadge]" />
    </div>
    <ng-content />
  `,
})
export class VikingHudPanel {
  readonly title = input.required<string>();
  readonly icon = input<VikingIconName | null>(null);
}
