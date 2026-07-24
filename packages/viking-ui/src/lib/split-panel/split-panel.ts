import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  model,
  OnDestroy,
  output,
  signal,
  viewChild,
  AfterViewInit,
} from "@angular/core";
import { VikingIcon } from "../icon/icon";

export type VikingSplitPanelWidth = "compact" | "medium" | "large";

/**
 * viking-split-panel — resizable slide-over panel for contextual details.
 * Based on Cloudscape Split Panel pattern, adapted for Viking-UI.
 * Used for pipeline status inspection, incident triage, and detail views.
 */
@Component({
  selector: "viking-split-panel",
  standalone: true,
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[class]": "hostClass()",
  },
  template: `
    @if (open()) {
      <aside
        #panel
        class="viking-split-panel"
        [attr.aria-label]="heading() || 'Details panel'"
        [attr.aria-modal]="modal() ? 'true' : null"
        role="dialog"
        tabindex="-1"
      >
        <header class="viking-split-panel__header">
          <h2 class="viking-split-panel__heading">{{ heading() }}</h2>
          <div class="viking-split-panel__actions">
            <ng-content select="[vikingSplitPanelActions]" />
            @if (dismissible()) {
              <button
                type="button"
                class="viking-split-panel__close"
                aria-label="Close panel"
                (click)="closePanel()"
              >
                <viking-icon name="x" [size]="20" />
              </button>
            }
          </div>
        </header>
        <div class="viking-split-panel__body">
          <ng-content />
        </div>
        <footer class="viking-split-panel__footer">
          <ng-content select="[vikingSplitPanelFooter]" />
        </footer>
      </aside>
      @if (modal()) {
        <div
          class="viking-split-panel__scrim"
          (click)="dismissible() && closePanel()"
        ></div>
      }
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .viking-split-panel {
        position: fixed;
        top: 0;
        right: 0;
        height: 100vh;
        width: 100vw;
        background: var(--viking-surface);
        border-left: 1px solid var(--viking-border-strong);
        display: flex;
        flex-direction: column;
        z-index: var(--viking-z-overlay);
        box-shadow: var(--viking-shadow-xl);
        animation: viking-split-panel-in var(--viking-duration)
          var(--viking-ease-out);
      }
      @keyframes viking-split-panel-in {
        from {
          transform: translateX(100%);
        }
        to {
          transform: translateX(0);
        }
      }
      .viking-split-panel__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--viking-space-2);
        padding: var(--viking-space-2);
        border-bottom: 1px solid var(--viking-border);
        flex-shrink: 0;
      }
      .viking-split-panel__heading {
        margin: 0;
        font-size: var(--viking-font-size-ui);
        font-weight: var(--viking-font-weight-bold);
        letter-spacing: var(--viking-letter-spacing-tight);
        color: var(--viking-text);
      }
      .viking-split-panel__actions {
        display: flex;
        align-items: center;
        gap: var(--viking-space-1);
      }
      .viking-split-panel__close {
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
      .viking-split-panel__close:hover {
        color: var(--viking-text);
        background: var(--viking-accent-soft);
        border-color: var(--viking-border-subtle);
      }
      .viking-split-panel__close:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-split-panel__body {
        flex: 1;
        overflow: auto;
        padding: var(--viking-space-2);
        font-size: var(--viking-font-size);
        color: var(--viking-text-muted);
        line-height: var(--viking-line-height-relaxed);
      }
      .viking-split-panel__footer {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: var(--viking-space-2);
        padding: var(--viking-space-2);
        border-top: 1px solid var(--viking-border);
      }
      .viking-split-panel__footer:empty {
        display: none;
      }
      .viking-split-panel__scrim {
        position: fixed;
        inset: 0;
        background: var(--viking-overlay-backdrop);
        backdrop-filter: blur(4px);
        z-index: calc(var(--viking-z-overlay) - 1);
        animation: viking-backdrop-in var(--viking-duration-fast)
          var(--viking-ease-default);
      }
      /* Size variants */
      :host(.viking-split-panel--compact) {
        --viking-split-panel-width: 320px;
      }
      :host(.viking-split-panel--medium) {
        --viking-split-panel-width: 480px;
      }
      :host(.viking-split-panel--large) {
        --viking-split-panel-width: 640px;
      }
      @media (min-width: 640px) {
        .viking-split-panel {
          width: var(--viking-split-panel-width, 480px);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .viking-split-panel {
          animation: none;
        }
        .viking-split-panel__scrim {
          animation: none;
        }
      }
    `,
  ],
})
export class VikingSplitPanel implements AfterViewInit, OnDestroy {
  readonly open = model<boolean>(false);
  readonly heading = input<string>("");
  readonly dismissible = input<boolean>(true);
  readonly modal = input<boolean>(false);
  readonly size = input<VikingSplitPanelWidth>("medium");

  readonly panelClosed = output<void>();
  readonly panelOpened = output<void>();

  protected readonly hostClass = computed(() =>
    ["viking-split-panel-wrapper", `viking-split-panel--${this.size()}`].join(
      " ",
    ),
  );

  ngAfterViewInit(): void {
    if (this.open()) {
      this.focusPanel();
    }
  }

  ngOnDestroy(): void {
    // Clean up any focus state
  }

  protected closePanel = (): void => {
    if (this.dismissible()) {
      this.open.set(false);
      this.panelClosed.emit();
    }
  };

  private focusPanel(): void {
    setTimeout(() => {
      const panel = document.querySelector(".viking-split-panel");
      if (panel instanceof HTMLElement) {
        panel.focus();
      }
    });
  }
}
