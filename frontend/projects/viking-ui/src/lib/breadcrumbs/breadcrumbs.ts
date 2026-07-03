import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { VikingIcon } from '../icon/icon';

export interface VikingBreadcrumb {
  label: string;
  href?: string;
}

/**
 * viking-breadcrumbs — hierarchy navigation.
 */
@Component({
  selector: 'viking-breadcrumbs',
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Breadcrumb">
      <ol class="viking-breadcrumbs">
        @for (item of items(); track item.label; let last = $last) {
          <li class="viking-breadcrumb">
            @if (item.href && !last) {
              <a [href]="item.href">{{ item.label }}</a>
            } @else {
              <span [attr.aria-current]="last ? 'page' : null">{{ item.label }}</span>
            }
            @if (!last) {
              <viking-icon name="chevron-right" [size]="16" />
            }
          </li>
        }
      </ol>
    </nav>
  `,
  styles: [
    `
      .viking-breadcrumbs {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--viking-space-1);
        margin: 0;
        padding: 0;
        list-style: none;
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size);
      }
      .viking-breadcrumb {
        display: inline-flex;
        align-items: center;
        gap: var(--viking-space-1);
        color: var(--viking-text-muted);
      }
      .viking-breadcrumb a {
        color: var(--viking-text-muted);
        text-decoration: none;
        border-bottom: 1px solid transparent;
        transition: var(--viking-transition);
      }
      .viking-breadcrumb a:hover,
      .viking-breadcrumb a:focus-visible {
        color: var(--viking-accent);
        border-bottom-color: var(--viking-accent);
      }
      .viking-breadcrumb a:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
        border-radius: 3px;
      }
      .viking-breadcrumb span[aria-current='page'] {
        color: var(--viking-text);
        font-weight: 600;
      }
    `,
  ],
})
export class VikingBreadcrumbs {
  readonly items = input.required<VikingBreadcrumb[]>();
}
