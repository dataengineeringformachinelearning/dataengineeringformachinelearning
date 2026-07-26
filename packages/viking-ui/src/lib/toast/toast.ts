import {
  ChangeDetectionStrategy,
  Component,
  Injectable,
  inject,
  input,
} from "@angular/core";
import { VikingIcon } from "../icon/icon";
import { VikingIconName } from "../../core/icons";
import {
  createToastStore,
  toastPriorityFromTone,
} from "../../core/toast-store";
import {
  VikingToastAction,
  VikingToastInstance,
  VikingToastOptions,
} from "../../core/types";

const TONE_ICONS: Record<string, VikingIconName> = {
  accent: "info",
  success: "check-circle",
  warning: "alert-triangle",
  danger: "alert-circle",
  muted: "info",
};

/**
 * VikingToastService — priority-aware imperative toast API (ADR-0020).
 * Render a single <viking-toaster> outlet near the app root.
 */
@Injectable({ providedIn: "root" })
export class VikingToastService {
  private readonly store = createToastStore<VikingToastInstance>({
    maxVisible: 3,
  });
  readonly toasts = this.store.messages;

  readonly show = (options: VikingToastOptions): number => {
    const tone = options.tone ?? "accent";
    const priority = options.priority ?? toastPriorityFromTone(tone);
    const toast: VikingToastInstance = {
      id: this.store.nextId(),
      heading: options.heading ?? "",
      text: options.text,
      tone,
      priority,
      duration: options.duration ?? 0,
      dedupeKey: options.dedupeKey,
      action: options.action,
    };
    // Prefer explicit duration; otherwise store uses priority defaults.
    const durationMs =
      options.duration === undefined ? undefined : options.duration;
    return this.store.add(toast, durationMs);
  };

  readonly success = (
    text: string,
    opts?: Omit<VikingToastOptions, "text" | "tone" | "priority">,
  ): number => this.show({ ...opts, text, tone: "success", priority: "low" });

  readonly critical = (
    text: string,
    opts?: Omit<VikingToastOptions, "text" | "tone" | "priority">,
  ): number =>
    this.show({ ...opts, text, tone: "danger", priority: "critical" });

  readonly dismiss = (id: number): void => {
    this.store.dismiss(id);
  };

  readonly clear = (): void => {
    this.store.clear();
  };

  readonly pause = (id?: number): void => {
    this.store.pause(id);
  };

  readonly resume = (id?: number): void => {
    this.store.resume(id);
  };
}

/**
 * viking-toaster — fixed-position outlet that renders active toasts.
 */
@Component({
  selector: "viking-toaster",
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[class.viking-toaster-top]": "position() === 'top-end'",
    role: "region",
    "aria-label": "Notifications",
    "aria-live": "polite",
    "aria-relevant": "additions text",
    "aria-atomic": "false",
  },
  template: `
    @for (toast of service.toasts(); track toast.id) {
      <div
        class="viking-toast"
        [class]="'viking-toast-' + toast.tone"
        [attr.data-tone]="toast.tone"
        [attr.data-priority]="toast.priority"
        [attr.role]="toast.priority === 'critical' ? 'alert' : 'status'"
        [attr.aria-live]="
          toast.priority === 'critical' ? 'assertive' : 'polite'
        "
        (pointerenter)="service.pause(toast.id)"
        (pointerleave)="service.resume(toast.id)"
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
        @if (toast.action; as action) {
          <button
            type="button"
            class="viking-toast-action"
            (click)="onAction(toast.id, action)"
          >
            {{ action.label }}
          </button>
        }
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
        bottom: var(--viking-space-2);
        right: var(--viking-space-2);
        left: var(--viking-space-2);
        display: flex;
        flex-direction: column;
        gap: var(--viking-space-1);
        z-index: var(--viking-z-toast);
        max-width: none;
        pointer-events: none;
      }
      @media (min-width: 768px) {
        :host {
          bottom: var(--viking-space-3);
          right: var(--viking-space-3);
          left: auto;
          max-width: min(414px, calc(100vw - var(--viking-space-4)));
        }
      }
      :host(.viking-toaster-top) {
        bottom: auto;
        top: var(--viking-space-3);
      }
      .viking-toast {
        pointer-events: auto;
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
      .viking-toast[data-priority="low"] {
        box-shadow: var(--viking-shadow-sm);
        opacity: 0.96;
      }
      .viking-toast[data-priority="critical"] {
        box-shadow: var(--viking-shadow-lg);
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
        margin-top: var(--viking-space-0-5);
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
      .viking-toast-action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: var(--viking-touch-target-min);
        border: none;
        background: transparent;
        color: var(--viking-accent);
        cursor: pointer;
        padding: var(--viking-space-0-5) var(--viking-space-1);
        border-radius: var(--viking-radius);
        font: inherit;
        font-weight: var(--viking-font-weight-semibold, 600);
        transition: var(--viking-transition-interactive);
      }
      .viking-toast-action:hover {
        background: var(--viking-accent-soft);
      }
      .viking-toast-action:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: 1px;
      }
      .viking-toast-close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: var(--viking-touch-target-min);
        min-height: var(--viking-touch-target-min);
        border: none;
        background: transparent;
        color: var(--viking-text-muted);
        cursor: pointer;
        padding: var(--viking-space-0-5);
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
export class VikingToaster {
  protected readonly service = inject(VikingToastService);

  readonly position = input<"bottom-end" | "top-end">("bottom-end");

  protected toneIcon = (tone: string): VikingIconName =>
    TONE_ICONS[tone] ?? "info";

  protected onAction(id: number, action: VikingToastAction): void {
    action.onClick();
    this.service.dismiss(id);
  }
}
