import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  input,
  output,
} from '@angular/core';

/**
 * viking-app-sidebar — dashboard sidebar shell styles (project nav markup inside).
 * Width is driven by the `--viking-sidebar-width` CSS variable on the host.
 */
@Component({
  selector: 'viking-app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'viking-app-sidebar-host',
    '[style.--viking-sidebar-width.px]': 'collapsed() ? null : width()',
  },
  template: `<ng-content />`,
  styleUrl: './app-sidebar.scss',
})
export class VikingAppSidebar {
  readonly collapsed = input<boolean>(false);
  readonly dragging = input<boolean>(false);
  readonly width = input<number>(260);
  readonly resizeStart = output<MouseEvent>();
}
