import { ChangeDetectionStrategy, Component } from "@angular/core";
import {
  VikingIcon,
  VikingIconName,
  VikingToastService,
} from "@dataengineeringformachinelearning/viking-ui";

const TONE_ICONS: Record<string, VikingIconName> = {
  accent: "info",
  success: "check-circle",
  warning: "alert-triangle",
  danger: "alert-circle",
  muted: "info",
};

/** App-local toast outlet — avoids cross-package field inject() NG0203 in production builds. */
@Component({
  selector: "app-toast-outlet",
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (toast of service.toasts(); track toast.id) {
      <div
        class="viking-toast"
        [class]="'viking-toast-' + toast.tone"
        role="status"
      >
        <viking-icon
          class="viking-toast-icon"
          [name]="toneIcon(toast.tone)"
          [size]="20"
        />
        <div class="viking-toast-body">
          @if (toast.heading) {
            <p class="viking-toast-heading">{{ toast.heading }}</p>
          }
          <p class="viking-toast-text">{{ toast.text }}</p>
        </div>
        <button
          type="button"
          class="viking-toast-close"
          aria-label="Dismiss notification"
          (click)="service.dismiss(toast.id)"
        >
          <viking-icon name="x" [size]="16" />
        </button>
      </div>
    }
  `,
  styles: [
    `
      :host {
        position: fixed;
        bottom: var(--viking-space-3);
        right: var(--viking-space-3);
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-1);
        z-index: var(--viking-z-toast);
        max-width: min(414px, calc(100vw - var(--viking-space-4)));
      }
      @media (max-width: 767px) {
        :host {
          bottom: var(--viking-space-2);
          right: var(--viking-space-2);
          left: var(--viking-space-2);
          max-width: none;
        }
      }
      .viking-toast {
        display: flex;
        align-items: flex-start;
        gap: var(--viking-space-1);
        padding: var(--viking-space-2);
        background: var(--viking-surface);
        border: 1px solid var(--viking-border-strong);
        border-radius: var(--viking-radius);
        box-shadow: var(--viking-shadow-md);
        font-family: var(--viking-font-family);
        animation: viking-toast-in var(--viking-duration) var(--viking-ease-out);
      }
      @keyframes viking-toast-in {
        from {
          transform: translateY(var(--viking-space-1));
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .viking-toast {
          animation: none;
        }
      }
      .viking-toast-icon {
        margin-top: 2px;
      }
      .viking-toast-accent .viking-toast-icon {
        color: var(--viking-accent);
      }
      .viking-toast-success .viking-toast-icon {
        color: var(--viking-success);
      }
      .viking-toast-warning .viking-toast-icon {
        color: var(--viking-warning);
      }
      .viking-toast-danger .viking-toast-icon {
        color: var(--viking-danger);
      }
      .viking-toast-body {
        flex: 1;
        min-width: 0;
      }
      .viking-toast-heading {
        margin: 0;
        font-size: var(--viking-font-size);
        font-weight: 600;
        color: var(--viking-text);
      }
      .viking-toast-text {
        margin: 0;
        font-size: var(--viking-font-size);
        color: var(--viking-text-muted);
        line-height: 1.45;
      }
      .viking-toast-close {
        display: inline-flex;
        border: none;
        background: transparent;
        color: var(--viking-text-muted);
        cursor: pointer;
        padding: var(--viking-space-half);
        border-radius: var(--viking-radius-pill);
        transition: var(--viking-transition-interactive);
      }
      .viking-toast-close:hover {
        color: var(--viking-text);
        background: var(--viking-accent-soft);
      }
      .viking-toast-close:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: 1px;
      }
    `,
  ],
})
export class ToastOutlet {
  constructor(protected readonly service: VikingToastService) {}

  protected toneIcon = (tone: string): VikingIconName =>
    TONE_ICONS[tone] ?? "info";
}
