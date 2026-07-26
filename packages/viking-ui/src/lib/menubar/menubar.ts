import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
} from "@angular/core";
import { nextRovingIndex } from "../../core/focus";

/**
 * viking-menubar — horizontal application menu bar with arrow-key roving focus.
 */
@Component({
  selector: "viking-menubar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: "menubar",
    class: "viking-menubar",
    "aria-label": "Menu bar",
    "(keydown)": "onKeydown($event)",
  },
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--viking-space-1);
        padding: var(--viking-space-1);
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius);
        background: var(--viking-surface);
        font-family: var(--viking-font-family);
      }
      :host ::ng-deep .viking-menubar-item,
      :host ::ng-deep button[role="menuitem"] {
        font-size: var(--viking-font-size-ui);
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: var(--viking-space-1);
        min-height: var(--viking-control-height-sm);
        padding: 0 var(--viking-space-2);
        border: 1px solid transparent;
        border-radius: var(--viking-radius);
        background: transparent;
        color: var(--viking-text);
        cursor: pointer;
        transition: var(--viking-transition);
      }
      :host ::ng-deep .viking-menubar-item:hover,
      :host ::ng-deep button[role="menuitem"]:hover {
        background: var(--viking-accent-soft);
        color: var(--viking-accent);
      }
      :host ::ng-deep .viking-menubar-item:focus-visible,
      :host ::ng-deep button[role="menuitem"]:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
    `,
  ],
})
export class VikingMenubar implements AfterViewInit {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  ngAfterViewInit(): void {
    this.syncRovingTabindex(0);
  }

  protected onKeydown = (event: KeyboardEvent): void => {
    const items = this.menuItems();
    if (items.length === 0) return;
    const currentIndex = Math.max(
      0,
      items.findIndex((el) => el === document.activeElement),
    );
    const next = nextRovingIndex(event.key, currentIndex, items.length);
    if (next === null) return;
    event.preventDefault();
    this.syncRovingTabindex(next);
    items[next]?.focus({ preventScroll: true });
  };

  private menuItems = (): HTMLElement[] =>
    Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>(
        '[role="menuitem"]',
      ),
    );

  private syncRovingTabindex = (activeIndex: number): void => {
    this.menuItems().forEach((el, index) => {
      el.tabIndex = index === activeIndex ? 0 : -1;
    });
  };
}

/**
 * viking-menubar-item — menu item trigger for viking-menubar.
 */
@Component({
  selector: "viking-menubar-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" role="menuitem" class="viking-menubar-item">
      <ng-content />
    </button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
    `,
  ],
})
export class VikingMenubarItem {}
