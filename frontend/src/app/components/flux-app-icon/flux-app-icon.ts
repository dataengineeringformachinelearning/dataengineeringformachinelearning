import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FluxIcon } from '@deml/flux-material';
import { mapMaterialIcon } from '../../core/flux-icon-map';

/** Bridges legacy Material icon names to flux-icon for incremental migration. */
@Component({
  selector: 'flux-app-icon',
  imports: [FluxIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.aria-hidden]': 'ariaHidden() ? "true" : null',
    '[class]': 'hostClass()',
    style: 'display: inline-flex; align-items: center; justify-content: center; vertical-align: middle; line-height: 1;',
  },
  template: `<flux-icon [name]="resolvedName()" [size]="size()" [spin]="spin()" />`,
})
export class FluxAppIcon {
  readonly name = input.required<string>();
  readonly size = input<number>(22);
  readonly spin = input<boolean>(false);
  readonly ariaHidden = input<boolean>(false);
  readonly hostClass = input<string>('');

  protected readonly resolvedName = computed(() => mapMaterialIcon(this.name()));
}
