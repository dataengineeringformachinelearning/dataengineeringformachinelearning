import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FluxIcon } from '../icon/icon';
import { FluxIconName } from '../core/icons';

/**
 * flux-navbar — horizontal navigation container (https://fluxui.dev/components/navbar).
 * Compose with flux-navbar-item and any other inline content.
 */
@Component({
  selector: 'flux-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.aria-label]': 'label()' },
  template: `<nav class="flux-navbar" [attr.aria-label]="label()"><ng-content /></nav>`,
  styles: [
    `
      :host {
        display: block;
      }
      .flux-navbar {
        display: flex;
        align-items: center;
        gap: var(--flux-space-1);
        flex-wrap: wrap;
        padding: var(--flux-space-1);
        background: var(--flux-surface);
        border: 1px solid var(--flux-border);
        border-radius: var(--flux-radius);
      }
    `,
  ],
})
export class FluxNavbar {
  readonly label = input<string>('Primary');
}

/** Navigation link/button inside flux-navbar. */
@Component({
  selector: 'flux-navbar-item',
  imports: [FluxIcon, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (href()) {
      <a
        class="flux-navbar-item"
        [href]="href()"
        [class.flux-current]="current()"
        [attr.aria-current]="current() ? 'page' : null"
      >
        <ng-container *ngTemplateOutlet="content" />
      </a>
    } @else {
      <button type="button" class="flux-navbar-item" [class.flux-current]="current()">
        <ng-container *ngTemplateOutlet="content" />
      </button>
    }
    <ng-template #content>
      @if (icon()) {
        <flux-icon [name]="icon()!" [size]="18" />
      }
      <ng-content />
    </ng-template>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      .flux-navbar-item {
        display: inline-flex;
        align-items: center;
        gap: var(--flux-space-1);
        border: none;
        background: transparent;
        color: var(--flux-text-muted);
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
        font-weight: 500;
        padding: var(--flux-space-1) var(--flux-space-2);
        border-radius: calc(var(--flux-radius) / 1.5);
        text-decoration: none;
        cursor: pointer;
        transition: var(--flux-transition);
      }
      .flux-navbar-item:hover {
        color: var(--flux-text);
        background: var(--flux-accent-soft);
      }
      .flux-navbar-item:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: -2px;
      }
      .flux-current {
        color: var(--flux-accent);
        font-weight: 600;
        background: var(--flux-accent-soft);
      }
    `,
  ],
})
export class FluxNavbarItem {
  readonly href = input<string | null>(null);
  readonly icon = input<FluxIconName | null>(null);
  readonly current = input<boolean>(false);
}
