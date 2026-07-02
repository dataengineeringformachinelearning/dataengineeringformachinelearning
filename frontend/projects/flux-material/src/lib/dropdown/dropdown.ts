import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { FluxIcon } from '../icon/icon';
import { FluxIconName } from '../core/icons';

/**
 * flux-dropdown — expandable menu (https://fluxui.dev/components/dropdown).
 * Project the trigger with `fluxTrigger`; fill the menu with flux-menu-item.
 */
@Component({
  selector: 'flux-dropdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(click)': 'onHostClick($event)',
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'open.set(false)',
  },
  template: `
    <span class="flux-dropdown-trigger">
      <ng-content select="[fluxTrigger]" />
    </span>
    @if (open()) {
      <div class="flux-dropdown-menu" [class.flux-dropdown-end]="align() === 'end'" role="menu">
        <ng-content />
      </div>
    }
  `,
  styles: [
    `
      :host {
        position: relative;
        display: inline-block;
      }
      .flux-dropdown-trigger {
        display: inline-flex;
      }
      .flux-dropdown-menu {
        position: absolute;
        top: calc(100% + var(--flux-space-1));
        left: 0;
        min-width: 216px;
        padding: var(--flux-space-1);
        background: var(--flux-surface);
        border: 1px solid var(--flux-border-strong);
        border-radius: var(--flux-radius);
        box-shadow: var(--flux-shadow-md);
        z-index: var(--flux-z-overlay);
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .flux-dropdown-end {
        left: auto;
        right: 0;
      }
    `,
  ],
})
export class FluxDropdown {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly open = model<boolean>(false);
  readonly align = input<'start' | 'end'>('start');

  /** Closes the menu; called by flux-menu-item on selection. */
  readonly close = (): void => {
    this.open.set(false);
  };

  /** Toggles when the (focusable, projected) trigger is activated. */
  protected onHostClick = (event: Event): void => {
    const trigger = this.host.nativeElement.querySelector('.flux-dropdown-trigger');
    if (trigger?.contains(event.target as Node)) {
      this.open.update(value => !value);
    }
  };

  protected onDocumentClick = (event: Event): void => {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  };
}

/**
 * flux-menu-item — action row inside flux-dropdown / flux-context menus.
 */
@Component({
  selector: 'flux-menu-item',
  imports: [FluxIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      role="menuitem"
      class="flux-menu-item"
      [class.flux-menu-item-danger]="danger()"
      [disabled]="disabled()"
      (click)="select($event)"
    >
      @if (icon()) {
        <flux-icon [name]="icon()!" [size]="18" />
      }
      <span class="flux-menu-item-label"><ng-content /></span>
      @if (kbd()) {
        <kbd class="flux-menu-item-kbd">{{ kbd() }}</kbd>
      }
    </button>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .flux-menu-item {
        display: flex;
        align-items: center;
        gap: var(--flux-space-1);
        width: 100%;
        border: none;
        background: transparent;
        color: var(--flux-text);
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
        padding: var(--flux-space-1) var(--flux-space-1);
        border-radius: calc(var(--flux-radius) / 1.5);
        cursor: pointer;
        text-align: left;
        transition: var(--flux-transition);
      }
      .flux-menu-item:hover:not(:disabled) {
        background: var(--flux-accent-soft);
      }
      .flux-menu-item:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: -2px;
      }
      .flux-menu-item:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .flux-menu-item-danger {
        color: var(--flux-danger);
      }
      .flux-menu-item-label {
        flex: 1;
        white-space: nowrap;
      }
      .flux-menu-item-kbd {
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
        color: var(--flux-text-muted);
      }
    `,
  ],
})
export class FluxMenuItem {
  private readonly dropdown = inject(FluxDropdown, { optional: true });

  readonly icon = input<FluxIconName | null>(null);
  readonly kbd = input<string | null>(null);
  readonly danger = input<boolean>(false);
  readonly disabled = input<boolean>(false);

  readonly selected = output<MouseEvent>();

  protected select = (event: MouseEvent): void => {
    this.selected.emit(event);
    this.dropdown?.close();
  };
}
