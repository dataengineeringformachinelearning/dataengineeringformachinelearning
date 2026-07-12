import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from "@angular/core";
import { VikingIcon } from "../icon/icon";

export type VikingFlashbarType = "success" | "error" | "warning" | "info";

export interface VikingFlashbarAction {
  label: string;
  id?: string;
}

/**
 * viking-flashbar — persistent inline notification bar.
 * Based on Cloudscape Flashbar pattern, adapted for Viking-UI.
 * Used for real-time status updates, pipeline alerts, and inline confirmations.
 */
@Component({
  selector: "viking-flashbar",
  standalone: true,
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="viking-flashbar"
      role="status"
      [attr.aria-live]="type() === 'error' ? 'assertive' : 'polite'"
    >
      <viking-icon
        class="viking-flashbar__icon"
        [name]="iconName()"
        [size]="20"
      />
      <div class="viking-flashbar__content">
        <p class="viking-flashbar__heading">{{ heading() }}</p>
        @if (description()) {
          <p class="viking-flashbar__description">{{ description() }}</p>
        }
      </div>
      <div class="viking-flashbar__actions">
        @if (primaryAction()) {
          <button
            type="button"
            class="viking-flashbar__button viking-flashbar__button--primary"
            (click)="primaryClicked.emit()"
          >
            {{ primaryAction()?.label }}
          </button>
        }
        @if (secondaryAction()) {
          <button
            type="button"
            class="viking-flashbar__button viking-flashbar__button--secondary"
            (click)="secondaryClicked.emit()"
          >
            {{ secondaryAction()?.label }}
          </button>
        }
        @if (dismissible()) {
          <button
            type="button"
            class="viking-flashbar__dismiss"
            aria-label="Dismiss notification"
            (click)="dismissed.set(true)"
          >
            <viking-icon name="x" [size]="16" />
          </button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host(.viking-flashbar-wrapper) {
        display: block;
        width: 100%;
      }
      .viking-flashbar {
        display: flex;
        align-items: flex-start;
        gap: var(--viking-space-2);
        padding: var(--viking-space-2);
        border-radius: var(--viking-radius);
        font-family: var(--viking-font-family);
        border: 1px solid;
        background: var(--viking-flashbar-bg, var(--viking-surface));
      }
      .viking-flashbar__icon {
        flex-shrink: 0;
        margin-top: var(--viking-space-0-5);
      }
      .viking-flashbar__content {
        flex: 1;
        min-width: 0;
      }
      .viking-flashbar__heading {
        margin: 0;
        font-size: var(--viking-font-size);
        font-weight: var(--viking-font-weight-semibold);
        color: var(--viking-flashbar-heading, var(--viking-text));
      }
      .viking-flashbar__description {
        margin: var(--viking-space-0-5) 0 0;
        font-size: var(--viking-font-size-sm);
        color: var(--viking-flashbar-description, var(--viking-text-muted));
        line-height: var(--viking-line-height-relaxed);
      }
      .viking-flashbar__actions {
        display: flex;
        align-items: center;
        gap: var(--viking-space-1);
        flex-shrink: 0;
      }
      .viking-flashbar__button {
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-sm);
        font-weight: var(--viking-font-weight-medium);
        padding: var(--viking-space-1) var(--viking-space-2);
        border-radius: var(--viking-radius-sm);
        cursor: pointer;
        transition: var(--viking-transition-interactive);
        border: 1px solid transparent;
      }
      .viking-flashbar__button--primary {
        background: var(--viking-flashbar-button-bg, var(--viking-accent));
        color: var(--viking-flashbar-button-text, var(--viking-on-accent));
      }
      .viking-flashbar__button--primary:hover {
        background: var(
          --viking-flashbar-button-hover-bg,
          var(--viking-accent-hover)
        );
      }
      .viking-flashbar__button--secondary {
        background: transparent;
        color: var(--viking-text-muted);
        border-color: var(--viking-border);
      }
      .viking-flashbar__button--secondary:hover {
        color: var(--viking-text);
        background: var(--viking-accent-soft);
      }
      .viking-flashbar__dismiss {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--viking-control-height-sm);
        height: var(--viking-control-height-sm);
        border: none;
        background: transparent;
        color: var(--viking-text-muted);
        cursor: pointer;
        padding: 0;
        border-radius: var(--viking-radius);
        transition: var(--viking-transition-interactive);
      }
      .viking-flashbar__dismiss:hover {
        color: var(--viking-text);
        background: var(--viking-accent-soft);
      }
      .viking-flashbar--success {
        --viking-flashbar-bg: color-mix(
          in srgb,
          var(--viking-success) 8%,
          transparent
        );
        --viking-flashbar-heading: var(--viking-success);
        --viking-flashbar-button-bg: var(--viking-success);
        --viking-flashbar-button-hover-bg: color-mix(
          in srgb,
          var(--viking-success) 80%,
          black 20%
        );
      }
      .viking-flashbar--error {
        --viking-flashbar-bg: color-mix(
          in srgb,
          var(--viking-danger) 8%,
          transparent
        );
        --viking-flashbar-heading: var(--viking-danger);
        --viking-flashbar-button-bg: var(--viking-danger);
        --viking-flashbar-button-hover-bg: color-mix(
          in srgb,
          var(--viking-danger) 80%,
          black 20%
        );
      }
      .viking-flashbar--warning {
        --viking-flashbar-bg: color-mix(
          in srgb,
          var(--viking-warning) 8%,
          transparent
        );
        --viking-flashbar-heading: var(--viking-warning);
        --viking-flashbar-button-bg: var(--viking-warning);
        --viking-flashbar-button-hover-bg: color-mix(
          in srgb,
          var(--viking-warning) 80%,
          black 20%
        );
      }
      .viking-flashbar--info {
        --viking-flashbar-bg: color-mix(
          in srgb,
          var(--viking-accent) 8%,
          transparent
        );
        --viking-flashbar-heading: var(--viking-accent);
        --viking-flashbar-button-bg: var(--viking-accent);
        --viking-flashbar-button-hover-bg: var(--viking-accent-hover);
      }
    `,
  ],
})
export class VikingFlashbar {
  readonly heading = input<string>("");
  readonly description = input<string>("");
  readonly type = input<VikingFlashbarType>("info");
  readonly dismissible = input<boolean>(true);
  readonly primaryAction = input<VikingFlashbarAction | null>(null);
  readonly secondaryAction = input<VikingFlashbarAction | null>(null);

  readonly primaryClicked = output<void>();
  readonly secondaryClicked = output<void>();

  protected readonly dismissed = signal(false);

  protected readonly iconName = computed(() => {
    const icons: Record<VikingFlashbarType, string> = {
      success: "check-circle",
      error: "alert-circle",
      warning: "alert-triangle",
      info: "info",
    };
    return icons[this.type()];
  });
}
