import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { VikingIcon, VikingIconSizePreset } from '@dataengineeringformachinelearning/viking-ui';
import { mapMaterialIcon } from '../../core/viking-icon-map';

/** Bridges legacy Material icon names to viking-icon for incremental migration. */
@Component({
  selector: 'viking-app-icon',
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-hidden]': 'ariaHidden() ? "true" : null',
    '[class]': 'hostClass()',
  },
  template: `<viking-icon
    [name]="resolvedName()"
    [size]="size()"
    [sizePreset]="sizePreset()"
    [spin]="spin()"
  />`,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        vertical-align: middle;
        line-height: 1;
      }
    `,
  ],
})
export class VikingAppIcon {
  readonly name = input.required<string>();
  readonly size = input<number | undefined>(22);
  readonly sizePreset = input<VikingIconSizePreset | null>(null);
  readonly spin = input<boolean>(false);
  readonly ariaHidden = input<boolean>(false);
  readonly hostClass = input<string>('');

  protected readonly resolvedName = computed(() => mapMaterialIcon(this.name()));
}
