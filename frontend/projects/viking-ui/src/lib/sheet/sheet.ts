import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  model,
  viewChild,
} from '@angular/core';
import { VikingIcon } from '../icon/icon';

export type VikingSheetSide = 'left' | 'right';

/**
 * viking-sheet — slide-over panel.
 */
@Component({
  selector: 'viking-sheet',
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      class="viking-sheet"
      [class.viking-sheet-left]="side() === 'left'"
      tabindex="-1"
      [attr.aria-label]="heading() || 'Panel'"
      (close)="open.set(false)"
      (click)="onBackdropClick($event)"
      (keydown.escape)="dismissible() && open.set(false)"
    >
      <div class="viking-sheet-surface">
        <header class="viking-sheet-header">
          @if (heading()) {
            <h2 class="viking-sheet-heading">{{ heading() }}</h2>
          }
          @if (dismissible()) {
            <button
              type="button"
              class="viking-sheet-close"
              aria-label="Close panel"
              (click)="open.set(false)"
            >
              <viking-icon name="x" [size]="20" />
            </button>
          }
        </header>
        <div class="viking-sheet-body"><ng-content /></div>
        <footer class="viking-sheet-footer"><ng-content select="[vikingSheetActions]" /></footer>
      </div>
    </dialog>
  `,
  styles: [
    `
      .viking-sheet {
        margin: 0;
        padding: 0;
        border: none;
        background: transparent;
        max-width: none;
        max-height: none;
        width: 100%;
        height: 100%;
        position: fixed;
        inset: 0;
      }
      .viking-sheet::backdrop {
        background: var(--viking-overlay-backdrop);
        backdrop-filter: blur(6px);
        animation: viking-backdrop-in var(--viking-duration-fast) var(--viking-ease-default);
      }
      .viking-sheet-surface {
        position: fixed;
        top: 0;
        right: 0;
        display: flex;
        flex-direction: column;
        width: min(420px, 100vw);
        height: 100%;
        background: var(--viking-surface);
        border-left: 1px solid var(--viking-border-strong);
        box-shadow: var(--viking-shadow-lg);
        font-family: var(--viking-font-family);
        animation: viking-slide-in-right var(--viking-duration) var(--viking-ease-default);
      }
      .viking-sheet-left .viking-sheet-surface {
        right: auto;
        left: 0;
        border-left: none;
        border-right: 1px solid var(--viking-border-strong);
      }
      .viking-sheet-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--viking-space-2);
        padding: var(--viking-space-2);
        border-bottom: 1px solid var(--viking-border);
      }
      .viking-sheet-heading {
        margin: 0;
        font-size: var(--viking-font-size-ui);
        font-weight: 700;
        letter-spacing: var(--header-letter-spacing, -0.02em);
      }
      .viking-sheet-close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--viking-control-height-sm);
        height: var(--viking-control-height-sm);
        border: 1px solid transparent;
        background: transparent;
        color: var(--viking-text-muted);
        cursor: pointer;
        padding: 0;
        border-radius: var(--viking-radius);
        transition: var(--viking-transition-interactive);
      }
      .viking-sheet-close:hover {
        color: var(--viking-text);
        background: var(--viking-accent-soft);
        border-color: var(--viking-border-subtle);
      }
      .viking-sheet-close:active {
        transform: scale(var(--viking-state-active-scale));
      }
      .viking-sheet-close:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-sheet-body {
        flex: 1;
        overflow: auto;
        padding: var(--viking-space-2);
        font-size: var(--viking-font-size);
        color: var(--viking-text);
        line-height: 1.6;
      }
      .viking-sheet-footer {
        display: flex;
        flex-wrap: wrap;
        gap: var(--viking-space-2);
        justify-content: flex-end;
        align-items: center;
        padding: var(--viking-space-2);
        border-top: 1px solid var(--viking-border);
      }
      :host ::ng-deep .viking-sheet-footer [vikingSheetActions] {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        align-items: center;
        gap: var(--viking-space-2);
        width: 100%;
      }
    `,
  ],
})
export class VikingSheet {
  readonly open = model(false);
  readonly heading = input('');
  readonly dismissible = input(true);
  readonly side = input<VikingSheetSide>('right');

  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialogRef().nativeElement;
      if (this.open() && !dialog.open) {
        dialog.showModal();
      } else if (!this.open() && dialog.open) {
        dialog.close();
      }
    });
  }

  protected onBackdropClick = (event: MouseEvent): void => {
    if (!this.dismissible()) return;
    const dialog = this.dialogRef().nativeElement;
    if (event.target === dialog) {
      this.open.set(false);
    }
  };
}
