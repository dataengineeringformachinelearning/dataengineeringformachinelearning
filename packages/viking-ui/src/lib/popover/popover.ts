import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  model,
} from "@angular/core";
import {
  captureReturnFocus,
  focusFirst,
  restoreFocus,
  trapTabKey,
} from "../../core/focus";

let popoverSeq = 0;

/**
 * viking-popover — anchored floating panel.
 * Project the trigger with the `vikingTrigger` attribute; everything else becomes
 * the panel content. Closes on Escape or outside interaction.
 */
@Component({
  selector: "viking-popover",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "(click)": "onHostClick($event)",
    "(document:click)": "onDocumentClick($event)",
    "(keydown)": "onHostKeydown($event)",
  },
  template: `
    <span class="viking-popover-trigger">
      <ng-content select="[vikingTrigger]" />
    </span>
    @if (open()) {
      <div
        class="viking-popover-panel"
        [id]="panelId"
        [class.viking-popover-end]="align() === 'end'"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        [attr.aria-label]="label()"
        (keydown)="onPanelKeydown($event)"
      >
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
      .viking-popover-trigger {
        display: inline-flex;
      }
      .viking-popover-panel {
        position: absolute;
        top: calc(100% + var(--viking-space-1));
        left: 0;
        min-width: 234px;
        max-width: 90vw;
        background: var(--viking-surface);
        border: 1px solid var(--viking-border-strong);
        border-radius: var(--viking-radius);
        box-shadow: var(--viking-shadow-md);
        padding: var(--viking-space-2);
        z-index: var(--viking-z-overlay);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-ui);
        color: var(--viking-text);
      }
      .viking-popover-end {
        left: auto;
        right: 0;
      }
    `,
  ],
})
export class VikingPopover {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly panelId = `viking-popover-panel-${++popoverSeq}`;
  private returnFocus: HTMLElement | null = null;

  readonly open = model<boolean>(false);
  readonly align = input<"start" | "end">("start");
  readonly label = input<string>("Popover");

  constructor() {
    let wasOpen = false;
    effect(() => {
      const isOpen = this.open();
      queueMicrotask(() => {
        this.syncTriggerAria(isOpen);
        if (isOpen && !wasOpen) {
          this.returnFocus = captureReturnFocus();
          const panel = this.host.nativeElement.querySelector<HTMLElement>(
            `#${this.panelId}`,
          );
          if (panel) focusFirst(panel);
        } else if (!isOpen && wasOpen) {
          restoreFocus(this.returnFocus);
          this.returnFocus = null;
        }
        wasOpen = isOpen;
      });
    });
  }

  /** Toggles when the (focusable, projected) trigger is activated. */
  protected onHostClick = (event: Event): void => {
    const trigger = this.host.nativeElement.querySelector(
      ".viking-popover-trigger",
    );
    if (trigger?.contains(event.target as Node)) {
      this.open.update((value) => !value);
    }
  };

  /** Switch / keyboard: Enter, Space, ArrowDown open (mirror dropdown). */
  protected onHostKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && this.open()) {
      event.preventDefault();
      this.open.set(false);
      return;
    }
    const trigger = this.host.nativeElement.querySelector(
      ".viking-popover-trigger",
    );
    if (!trigger?.contains(event.target as Node)) return;
    if (
      !this.open() &&
      (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      this.open.set(true);
    }
  };

  protected onDocumentClick = (event: Event): void => {
    if (
      this.open() &&
      !this.host.nativeElement.contains(event.target as Node)
    ) {
      this.open.set(false);
    }
  };

  protected onPanelKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      this.open.set(false);
      return;
    }
    const panel = event.currentTarget as HTMLElement;
    trapTabKey(event, panel);
  };

  private syncTriggerAria = (isOpen: boolean): void => {
    const root = this.host.nativeElement.querySelector(
      ".viking-popover-trigger",
    );
    if (!root) return;
    const control =
      root.querySelector<HTMLElement>(
        "button, a[href], [role='button'], summary, .viking-btn, .suite-btn, .fj-btn",
      ) ?? (root.firstElementChild as HTMLElement | null);
    if (!control) return;
    control.setAttribute("aria-expanded", String(isOpen));
    control.setAttribute("aria-haspopup", "dialog");
    control.setAttribute("aria-controls", this.panelId);
  };
}
