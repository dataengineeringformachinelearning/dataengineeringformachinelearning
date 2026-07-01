import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FluxIcon } from '../icon/icon';

export interface FluxBreadcrumb {
  label: string;
  href?: string;
}

/**
 * flux-breadcrumbs — hierarchy navigation (https://fluxui.dev/components/breadcrumbs).
 */
@Component({
  selector: 'flux-breadcrumbs',
  imports: [FluxIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Breadcrumb">
      <ol class="flux-breadcrumbs">
        @for (item of items(); track item.label; let last = $last) {
          <li class="flux-breadcrumb">
            @if (item.href && !last) {
              <a [href]="item.href">{{ item.label }}</a>
            } @else {
              <span [attr.aria-current]="last ? 'page' : null">{{ item.label }}</span>
            }
            @if (!last) {
              <flux-icon name="chevron-right" [size]="16" />
            }
          </li>
        }
      </ol>
    </nav>
  `,
  styles: [
    `
      .flux-breadcrumbs {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: var(--flux-space-1);
        margin: 0;
        padding: 0;
        list-style: none;
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
      }
      .flux-breadcrumb {
        display: inline-flex;
        align-items: center;
        gap: var(--flux-space-1);
        color: var(--flux-text-muted);
      }
      .flux-breadcrumb a {
        color: var(--flux-text-muted);
        text-decoration: none;
        border-bottom: 1px solid transparent;
        transition: var(--flux-transition);
      }
      .flux-breadcrumb a:hover,
      .flux-breadcrumb a:focus-visible {
        color: var(--flux-accent);
        border-bottom-color: var(--flux-accent);
      }
      .flux-breadcrumb a:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: var(--flux-ring-offset);
        border-radius: 3px;
      }
      .flux-breadcrumb span[aria-current='page'] {
        color: var(--flux-text);
        font-weight: 600;
      }
    `,
  ],
})
export class FluxBreadcrumbs {
  readonly items = input.required<FluxBreadcrumb[]>();
}
