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
  template: `
    @if (sizePreset(); as preset) {
      <viking-icon [name]="resolvedName()" [sizePreset]="preset" [spin]="spin()" />
    } @else {
      <viking-icon [name]="resolvedName()" [size]="sizeValue()" [spin]="spin()" />
    }
  `,
})
export class VikingAppIcon {
  readonly name = input.required<string>();
  readonly size = input<number | undefined>(22);
  readonly sizePreset = input<VikingIconSizePreset | null>(null);
  readonly spin = input<boolean>(false);
  readonly ariaHidden = input<boolean>(false);
  readonly hostClass = input<string>('');

  protected readonly resolvedName = computed(() => mapMaterialIcon(this.name()));
  protected readonly sizeValue = computed(() => this.size() ?? 22);
}
