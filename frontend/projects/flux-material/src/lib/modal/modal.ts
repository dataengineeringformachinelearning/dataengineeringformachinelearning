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
import { FluxIcon } from '../icon/icon';

/**
 * flux-modal — dialog built on the native <dialog> element
 * (https://fluxui.dev/components/modal). Toggle via the `open` model.
 */
@Component({
  selector: 'flux-modal',
  imports: [FluxIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      class="flux-modal"
      tabindex="-1"
      [attr.aria-label]="heading() || 'Dialog'"
      (close)="open.set(false)"
      (click)="onBackdropClick($event)"
      (keydown.escape)="dismissible() && open.set(false)"
    >
      <div class="flux-modal-surface">
        <header class="flux-modal-header">
          @if (heading()) {
            <h2 class="flux-modal-heading">{{ heading() }}</h2>
          }
          @if (dismissible()) {
            <button
              type="button"
              class="flux-modal-close"
              aria-label="Close dialog"
              (click)="open.set(false)"
            >
              <flux-icon name="x" [size]="20" />
            </button>
          }
        </header>
        <div class="flux-modal-body"><ng-content /></div>
        <footer class="flux-modal-footer"><ng-content select="[fluxModalActions]" /></footer>
      </div>
    </dialog>
  `,
  styles: [
    `
      .flux-modal {
        padding: 0;
        border: 1px solid var(--flux-border-strong);
        border-radius: var(--flux-radius-lg);
        background: var(--flux-surface);
        color: var(--flux-text);
        box-shadow: var(--flux-shadow-md);
        width: min(522px, calc(100vw - var(--flux-space-4)));
      }
      .flux-modal::backdrop {
        background: var(--flux-overlay-backdrop, rgba(49, 57, 60, 0.55));
        backdrop-filter: blur(4px);
      }
      .flux-modal-surface {
        display: flex;
        flex-direction: column;
        padding: var(--flux-space-3);
        gap: var(--flux-space-2);
        font-family: var(--flux-font-family);
      }
      .flux-modal-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--flux-space-2);
      }
      .flux-modal-heading {
        margin: 0;
        font-size: var(--flux-font-size-lg);
        font-weight: 600;
        letter-spacing: var(--header-letter-spacing, -0.02em);
      }
      .flux-modal-close {
        display: inline-flex;
        border: none;
        background: transparent;
        color: var(--flux-text-muted);
        cursor: pointer;
        padding: 4px;
        border-radius: var(--flux-radius);
      }
      .flux-modal-close:hover {
        color: var(--flux-text);
        background: var(--flux-accent-soft);
      }
      .flux-modal-close:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: 1px;
      }
      .flux-modal-body {
        font-size: var(--flux-font-size);
        line-height: 1.6;
        color: var(--flux-text-muted);
      }
      .flux-modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: var(--flux-space-1);
      }
      .flux-modal-footer:empty {
        display: none;
      }
    `,
  ],
})
export class FluxModal {
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
