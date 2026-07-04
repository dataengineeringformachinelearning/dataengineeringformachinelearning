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

/**
 * viking-modal — dialog built on the native <dialog> element
 *. Toggle via the `open` model.
 */
@Component({
  selector: 'viking-modal',
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      class="viking-modal"
      tabindex="-1"
      [attr.aria-label]="heading() || 'Dialog'"
      (close)="open.set(false)"
      (click)="onBackdropClick($event)"
      (keydown.escape)="dismissible() && open.set(false)"
    >
      <div class="viking-modal-surface">
        <header class="viking-modal-header">
          @if (heading()) {
            <h2 class="viking-modal-heading">{{ heading() }}</h2>
          }
          @if (dismissible()) {
            <button
              type="button"
              class="viking-modal-close"
              aria-label="Close dialog"
              (click)="open.set(false)"
            >
              <viking-icon name="x" [size]="20" />
            </button>
          }
        </header>
        <div class="viking-modal-body"><ng-content /></div>
        <footer class="viking-modal-footer"><ng-content select="[vikingModalActions]" /></footer>
      </div>
    </dialog>
  `,
  styles: [
    `
      .viking-modal {
        padding: 0;
        border: 1px solid var(--viking-border-strong);
        border-radius: var(--viking-radius-lg);
        background: var(--viking-surface);
        color: var(--viking-text);
        box-shadow: var(--viking-shadow-lg);
        width: min(522px, calc(100vw - var(--viking-space-4)));
        animation: viking-modal-in var(--viking-duration) var(--viking-ease-default);
      }
      .viking-modal::backdrop {
        background: var(--viking-overlay-backdrop);
        backdrop-filter: blur(6px);
        animation: viking-backdrop-in var(--viking-duration-fast) var(--viking-ease-default);
      }
      .viking-modal-surface {
        display: flex;
        flex-direction: column;
        padding: var(--viking-space-3);
        gap: var(--viking-space-2);
        font-family: var(--viking-font-family);
      }
      .viking-modal-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--viking-space-2);
        padding-bottom: var(--viking-space-1);
        border-bottom: 1px solid var(--viking-border-subtle);
      }
      .viking-modal-heading {
        margin: 0;
        font-size: var(--viking-font-size-md);
        font-weight: var(--viking-font-weight-bold);
        letter-spacing: var(--viking-letter-spacing-tight);
        color: var(--viking-text);
        line-height: var(--viking-line-height-tight);
      }
      .viking-modal-close {
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
        flex-shrink: 0;
      }
      .viking-modal-close:hover {
        color: var(--viking-text);
        background: var(--viking-accent-soft);
        border-color: var(--viking-border-subtle);
      }
      .viking-modal-close:active {
        transform: scale(var(--viking-state-active-scale));
      }
      .viking-modal-close:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-modal-body {
        font-size: var(--viking-font-size);
        line-height: var(--viking-line-height-relaxed);
        color: var(--viking-text-muted);
        animation: viking-fade-in var(--viking-duration) var(--viking-ease-default);
      }
      .viking-modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: var(--viking-space-2);
        padding-top: var(--viking-space-2);
        border-top: 1px solid var(--viking-border-subtle);
      }
      .viking-modal-footer:empty {
        display: none;
      }
      @media (prefers-reduced-motion: reduce) {
        .viking-modal {
          animation: none;
        }
        .viking-modal::backdrop {
          animation: none;
        }
        .viking-modal-body {
          animation: none;
        }
      }
    `,
  ],
})
export class VikingModal {
  private readonly dialogRef = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  readonly open = model<boolean>(false);
  readonly heading = input<string>('');
  readonly dismissible = input<boolean>(true);

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    effect(() => {
      const dialog = this.dialogRef().nativeElement;
      // showModal is unavailable during SSR; the dialog stays closed there.
      if (typeof dialog.showModal !== 'function') {
        return;
      }
      if (this.open() && host.nativeElement.isConnected && !dialog.open) {
        dialog.showModal();
      } else if (!this.open() && dialog.open) {
        dialog.close();
      }
    });
  }

  protected onBackdropClick = (event: MouseEvent): void => {
    if (this.dismissible() && event.target === this.dialogRef().nativeElement) {
      this.open.set(false);
    }
  };
}
