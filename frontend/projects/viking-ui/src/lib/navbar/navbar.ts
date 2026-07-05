import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { VikingIcon } from '../icon/icon';
import { VikingIconName } from '../../../../../packages/viking-ui/src/core/icons';

/**
 * viking-navbar — horizontal navigation container.
 * Compose with viking-navbar-item and any other inline content.
 */
@Component({
  selector: 'viking-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.aria-label]': 'label()' },
  template: `<nav class="viking-navbar" [attr.aria-label]="label()"><ng-content /></nav>`,
  styles: [
    `
      :host {
        display: block;
      }
      .viking-navbar {
        display: flex;
        align-items: center;
        gap: var(--viking-space-half);
        flex-wrap: wrap;
        padding: var(--viking-space-half);
        background: color-mix(in srgb, var(--viking-surface) 96%, transparent);
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius-lg);
        box-shadow: var(--viking-shadow-sm);
      }
    `,
  ],
})
export class VikingNavbar {
  readonly label = input<string>('Primary');
}

/** Navigation link/button inside viking-navbar. */
@Component({
  selector: 'viking-navbar-item',
  imports: [VikingIcon, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-template #content>
      @if (icon()) {
        <viking-icon [name]="icon()!" [size]="18" />
      }
      <ng-content />
    </ng-template>

    @if (href()) {
      <a
        class="viking-navbar-item"
        [href]="href()"
        [class.viking-current]="current()"
        [attr.aria-current]="current() ? 'page' : null"
      >
        <ng-container *ngTemplateOutlet="content" />
      </a>
    } @else {
      <button type="button" class="viking-navbar-item" [class.viking-current]="current()">
        <ng-container *ngTemplateOutlet="content" />
      </button>
    }
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      .viking-navbar-item {
        display: inline-flex;
        align-items: center;
        gap: var(--viking-space-1);
        border: 1px solid transparent;
        background: transparent;
        color: var(--viking-text-muted);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-sm);
        font-weight: var(--viking-font-weight-medium);
        padding: var(--viking-space-1) var(--viking-space-1-5);
        border-radius: var(--viking-radius);
        text-decoration: none;
        cursor: pointer;
        transition: var(--viking-transition-interactive);
        position: relative;
      }
      .viking-navbar-item:hover {
        color: var(--viking-text);
        background: var(--viking-accent-soft);
      }
      .viking-navbar-item:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-current {
        color: var(--viking-text);
        font-weight: var(--viking-font-weight-semibold);
        background: var(--viking-accent-soft);
      }
      .viking-current::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: var(--viking-space-1);
        right: var(--viking-space-1);
        height: 2px;
        border-radius: var(--viking-radius-pill);
        background: var(--viking-accent);
      }
    `,
  ],
})
export class VikingNavbarItem {
  readonly href = input<string | null>(null);
  readonly icon = input<VikingIconName | null>(null);
  readonly current = input<boolean>(false);
}
