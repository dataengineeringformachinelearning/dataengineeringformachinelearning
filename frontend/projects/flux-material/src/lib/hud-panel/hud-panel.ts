import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FluxIcon } from '../icon/icon';
import { FluxIconName } from '../core/icons';

/** flux-hud-panel — bordered dashboard panel with icon header. */
@Component({
  selector: 'flux-hud-panel',
  imports: [FluxIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flux-hud-panel panel-section',
  },
  template: `
    <div class="flux-hud-panel-header panel-header">
      @if (icon()) {
        <flux-icon [name]="icon()!" [size]="20" class="panel-icon" />
      }
      <h2 class="flux-hud-panel-title">{{ title() }}</h2>
      <ng-content select="[fluxHudPanelBadge]" />
    </div>
    <ng-content />
  `,
})
export class FluxHudPanel {
  readonly title = input.required<string>();
  readonly icon = input<FluxIconName | null>(null);
}
