import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  input,
  output,
} from '@angular/core';

/**
 * flux-app-sidebar — dashboard sidebar shell styles (project nav markup inside).
 * Width is driven by the `--flux-sidebar-width` CSS variable on the host.
 */
@Component({
  selector: 'flux-app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'flux-app-sidebar-host',
    '[style.--flux-sidebar-width.px]': 'collapsed() ? null : width()',
  },
  template: `<ng-content />`,
  styleUrl: './app-sidebar.scss',
})
export class FluxAppSidebar {
  readonly collapsed = input<boolean>(false);
  readonly dragging = input<boolean>(false);
  readonly width = input<number>(260);
  readonly resizeStart = output<MouseEvent>();
}
