import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';

/**
 * flux-context — right-click context menu (https://fluxui.dev/components/context).
 * Wrap the target content and project menu content with the `fluxMenu` attribute
 * (typically flux-menu-item elements).
 */
@Component({
  selector: 'flux-context',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(contextmenu)': 'onContextMenu($event)',
    '(document:click)': 'closed()',
    '(keydown.escape)': 'closed()',
  },
  template: `
    <ng-content />
    @if (open()) {
      <div
        class="flux-context-menu"
        role="menu"
        [style.left.px]="position().x"
        [style.top.px]="position().y"
      >
        <ng-content select="[fluxMenu]" />
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        position: relative;
      }
      .flux-context-menu {
        position: absolute;
        min-width: 198px;
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
    `,
  ],
})
export class FluxContext {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly open = signal(false);
  protected readonly position = signal({ x: 0, y: 0 });

  protected onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    const rect = this.host.nativeElement.getBoundingClientRect();
    this.position.set({ x: event.clientX - rect.left, y: event.clientY - rect.top });
    this.open.set(true);
  };

  protected closed = (): void => {
    this.open.set(false);
  };
}
