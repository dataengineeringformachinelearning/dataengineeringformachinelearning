import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  input,
  model,
  viewChild,
} from "@angular/core";
import { NativeDialogSession } from "../../core/dialog-session";
import { vikingUid } from "../../core/uid";
import { VikingIcon } from "../icon/icon";

/**
 * viking-modal — dialog built on the native <dialog> element
 *. Toggle via the `open` model.
 */
@Component({
  selector: "viking-modal",
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      class="viking-modal"
      tabindex="-1"
      aria-modal="true"
      [attr.aria-labelledby]="heading() ? titleId : null"
      [attr.aria-label]="heading() ? null : 'Dialog'"
      (close)="onNativeClose()"
      (click)="onBackdropClick($event)"
      (keydown)="onDialogKeydown($event)"
      (keydown.escape)="dismissible() && open.set(false)"
    >
      <div class="viking-modal-surface">
        <header class="viking-modal-header">
          @if (heading()) {
            <h2 class="viking-modal-heading" [id]="titleId">{{ heading() }}</h2>
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
        <footer class="viking-modal-footer">
          <ng-content select="[vikingModalActions]" />
        </footer>
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
        animation: viking-modal-in var(--viking-duration)
          var(--viking-ease-default);
        overflow: hidden;
      }
      .viking-modal:not([open]) {
        display: none !important;
        pointer-events: none;
      }
      .viking-modal::backdrop {
        background: var(--viking-overlay-backdrop);
        backdrop-filter: blur(8px);
        animation: viking-backdrop-in var(--viking-duration-fast)
          var(--viking-ease-default);
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
        min-width: var(--viking-touch-target-min, 44px);
        min-height: var(--viking-touch-target-min, 44px);
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
        animation: viking-fade-in var(--viking-duration)
          var(--viking-ease-default);
      }
      .viking-modal-footer {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        align-items: center;
        gap: var(--viking-space-2);
        padding-top: var(--viking-space-2);
        border-top: 1px solid var(--viking-border-subtle);
      }
      .viking-modal-footer:empty {
        display: none;
      }
      /* Projected action wrappers keep buttons in a single slot — spread gap inside */
      :host ::ng-deep .viking-modal-footer [vikingModalActions] {
        display: flex;
        flex-wrap: nowrap;
        justify-content: flex-end;
        align-items: center;
        gap: var(--viking-space-2);
        width: 100%;
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
export class VikingModal implements OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly dialogRef =
    viewChild.required<ElementRef<HTMLDialogElement>>("dialog");
  private readonly session = new NativeDialogSession();

  readonly open = model<boolean>(false);
  readonly heading = input<string>("");
  readonly dismissible = input<boolean>(true);
  protected readonly titleId = vikingUid("viking-modal-title");

  constructor() {
    effect(() => {
      this.session.syncOpen(this.dialogRef().nativeElement, this.open(), {
        connected: this.host.nativeElement.isConnected,
      });
    });
  }

  ngOnDestroy(): void {
    this.session.destroy(this.dialogRef()?.nativeElement);
  }

  protected onNativeClose = (): void => {
    this.session.onNativeClose(() => {
      if (this.open()) this.open.set(false);
    });
  };

  protected onBackdropClick = (event: MouseEvent): void => {
    this.session.onBackdropClick(
      event,
      this.dialogRef().nativeElement,
      this.dismissible() && this.open(),
      () => this.open.set(false),
    );
  };

  /** Defensive Tab cycle — complements native showModal() focus trap. */
  protected onDialogKeydown = (event: KeyboardEvent): void => {
    this.session.onKeydown(event, this.dialogRef().nativeElement);
  };
}
