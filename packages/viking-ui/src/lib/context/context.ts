import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
} from "@angular/core";

/**
 * viking-context — right-click context menu.
 * Wrap the target content and project menu content with the `vikingMenu` attribute
 * (typically viking-menu-item elements).
 */
@Component({
  selector: "viking-context",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "(contextmenu)": "onContextMenu($event)",
    "(document:click)": "closed()",
    "(keydown.escape)": "closed()",
  },
  template: `
    <ng-content />
    @if (open()) {
      <div
        class="viking-context-menu"
        role="menu"
        [style.left.px]="position().x"
        [style.top.px]="position().y"
      >
        <ng-content select="[vikingMenu]" />
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        position: relative;
      }
      .viking-context-menu {
        position: absolute;
        min-width: 198px;
        padding: var(--viking-space-1);
        background: var(--viking-surface);
        border: 1px solid var(--viking-border-strong);
        border-radius: var(--viking-radius);
        box-shadow: var(--viking-shadow-md);
        z-index: var(--viking-z-overlay);
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-0-5);
      }
    `,
  ],
})
export class VikingContext {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly open = signal(false);
  protected readonly position = signal({ x: 0, y: 0 });

  protected onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    const rect = this.host.nativeElement.getBoundingClientRect();
    this.position.set({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    this.open.set(true);
  };

  protected closed = (): void => {
    this.open.set(false);
  };
}
