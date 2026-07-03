import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface VikingNavItem {
  label: string;
  href?: string;
  active?: boolean;
  disabled?: boolean;
}

/**
 * viking-navigation-menu — primary nav links with active indicator.
 */
@Component({
  selector: 'viking-navigation-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'navigation',
    class: 'viking-navigation-menu',
    '[attr.aria-label]': 'label()',
  },
  template: `
    <ul class="viking-nav-list" role="list">
      @for (item of items(); track item.label) {
        <li class="viking-nav-item" role="listitem">
          @if (item.href && !item.disabled) {
            <a
              class="viking-nav-link"
              [class.viking-active]="item.active"
              [href]="item.href"
              [attr.aria-current]="item.active ? 'page' : null"
            >
              {{ item.label }}
            </a>
          } @else {
            <span
              class="viking-nav-link"
              [class.viking-active]="item.active"
              [class.viking-disabled]="item.disabled"
              [attr.aria-disabled]="item.disabled ? 'true' : null"
            >
              {{ item.label }}
            </span>
          }
        </li>
      }
    </ul>
  `,
  styles: [
    `
      :host {
        display: block;
        font-family: var(--viking-font-family);
      }
      .viking-nav-list {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--viking-space-1);
        margin: 0;
        padding: var(--viking-space-1);
        list-style: none;
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius);
        background: var(--viking-surface-alt);
      }
      .viking-nav-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: var(--viking-control-height-sm);
        min-width: var(--viking-btn-min-width, 120px);
        padding: 0 var(--viking-space-2);
        font-size: var(--viking-font-size-ui);
        font-weight: 700;
        color: var(--viking-text-muted);
        text-decoration: none;
        border-radius: var(--viking-radius);
        transition: var(--viking-transition);
      }
      a.viking-nav-link:hover {
        color: var(--viking-text);
        background: var(--viking-accent-soft);
      }
      a.viking-nav-link:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-nav-link.viking-active {
        color: var(--viking-accent-content);
        background: var(--viking-accent);
      }
      .viking-nav-link.viking-disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
    `,
  ],
})
export class VikingNavigationMenu {
  readonly label = input('Main');
  readonly items = input<VikingNavItem[]>([]);
}
