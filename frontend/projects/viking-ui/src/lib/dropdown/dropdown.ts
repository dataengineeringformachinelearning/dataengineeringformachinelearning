import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { VikingIcon } from '../icon/icon';
import { VikingIconName } from '../core/icons';

/**
 * viking-dropdown — expandable menu.
 * Project the trigger with `vikingTrigger`; fill the menu with viking-menu-item.
 */
@Component({
  selector: 'viking-dropdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(click)': 'onHostClick($event)',
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'open.set(false)',
  },
  template: `
    <span class="viking-dropdown-trigger">
      <ng-content select="[vikingTrigger]" />
    </span>
    @if (open()) {
      <div class="viking-dropdown-menu" [class.viking-dropdown-end]="align() === 'end'" role="menu">
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
      .viking-dropdown-trigger {
        display: inline-flex;
      }
      .viking-dropdown-menu {
        position: absolute;
        top: calc(100% + var(--viking-space-1));
        left: 0;
        min-width: 216px;
        padding: var(--viking-space-1);
        background: var(--viking-surface);
        border: 1px solid var(--viking-border-strong);
        border-radius: var(--viking-radius);
        box-shadow: var(--viking-shadow-md);
        z-index: var(--viking-z-overlay);
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .viking-dropdown-end {
        left: auto;
        right: 0;
      }
    `,
  ],
})
export class VikingDropdown {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly open = model<boolean>(false);
  readonly align = input<'start' | 'end'>('start');

  /** Closes the menu; called by viking-menu-item on selection. */
  readonly close = (): void => {
    this.open.set(false);
  };

  /** Toggles when the (focusable, projected) trigger is activated. */
  protected onHostClick = (event: Event): void => {
    const trigger = this.host.nativeElement.querySelector('.viking-dropdown-trigger');
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
 * viking-menu-item — action row inside viking-dropdown / viking-context menus.
 */
@Component({
  selector: 'viking-menu-item',
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      role="menuitem"
      class="viking-menu-item"
      [class.viking-menu-item-danger]="danger()"
      [disabled]="disabled()"
      (click)="select($event)"
    >
      @if (icon()) {
        <viking-icon [name]="icon()!" [size]="18" />
      }
      <span class="viking-menu-item-label"><ng-content /></span>
      @if (kbd()) {
        <kbd class="viking-menu-item-kbd">{{ kbd() }}</kbd>
      }
    </button>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .viking-menu-item {
        display: flex;
        align-items: center;
        gap: var(--viking-space-1);
        width: 100%;
        border: none;
        background: transparent;
        color: var(--viking-text);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-ui);
        font-weight: 600;
        padding: var(--viking-space-1) var(--viking-space-1);
        border-radius: calc(var(--viking-radius) / 1.5);
        cursor: pointer;
        text-align: left;
        transition: var(--viking-transition);
      }
      .viking-menu-item:hover:not(:disabled) {
        background: var(--viking-accent-soft);
      }
      .viking-menu-item:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: -2px;
      }
      .viking-menu-item:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .viking-menu-item-danger {
        color: var(--viking-danger);
      }
      .viking-menu-item-label {
        flex: 1;
        white-space: nowrap;
      }
      .viking-menu-item-kbd {
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-ui);
        color: var(--viking-text-muted);
      }
    `,
  ],
})
export class VikingMenuItem {
  private readonly dropdown = inject(VikingDropdown, { optional: true });

  readonly icon = input<VikingIconName | null>(null);
  readonly kbd = input<string | null>(null);
  readonly danger = input<boolean>(false);
  readonly disabled = input<boolean>(false);

  readonly selected = output<MouseEvent>();

  protected select = (event: MouseEvent): void => {
    this.selected.emit(event);
    this.dropdown?.close();
  };
}
