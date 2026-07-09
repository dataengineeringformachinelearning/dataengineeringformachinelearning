import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from "@angular/core";
import { VikingIcon } from "../icon/icon";
import { VikingIconName } from "../../core/icons";
import { VikingTone } from "../../core/types";

const TONE_ICONS: Record<string, VikingIconName> = {
  accent: "info",
  secondary: "info",
  success: "check-circle",
  warning: "alert-triangle",
  danger: "alert-circle",
  info: "info",
  muted: "info",
};

/**
 * viking-callout — highlighted message block.
 */
@Component({
  selector: "viking-callout",
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: "note",
    "[class]": "'viking-callout-' + tone()",
    "[style.display]": "dismissed() ? 'none' : null",
  },
  template: `
    <viking-icon
      class="viking-callout-icon"
      [name]="resolvedIcon()"
      [size]="22"
    />
    <div class="viking-callout-body">
      @if (heading()) {
        <p class="viking-callout-heading">{{ heading() }}</p>
      }
      <div class="viking-callout-text"><ng-content /></div>
    </div>
    @if (dismissible()) {
      <button
        type="button"
        class="viking-callout-close"
        aria-label="Dismiss"
        (click)="dismiss()"
      >
        <viking-icon name="x" [size]="18" />
      </button>
    }
  `,
  styles: [
    `
      :host {
        display: flex;
        align-items: flex-start;
        gap: var(--viking-space-3); /* Improved gap for polish */
        padding: var(--viking-space-4); /* Generous breathing room */
        border-radius: var(--viking-radius-xl); /* Consistent softer */
        background: var(--viking-surface);
        color: var(--viking-text);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-sm);
        transition: var(--viking-transition-interactive);
        box-shadow: var(--viking-shadow-xs);
      }
      .viking-callout-icon {
        margin-top: 2px;
        color: var(--viking-text-muted);
        flex-shrink: 0;
      }
      :host(.viking-callout-accent) {
        background: var(--viking-accent-soft);
      }
      :host(.viking-callout-accent) .viking-callout-icon {
        color: var(--viking-accent);
      }
      :host(.viking-callout-secondary) {
        background: var(--viking-accent-secondary-soft);
      }
      :host(.viking-callout-secondary) .viking-callout-icon {
        color: var(--viking-accent-secondary);
      }
      :host(.viking-callout-info) {
        background: color-mix(
          in srgb,
          var(--viking-info) 10%,
          var(--viking-surface)
        );
      }
      :host(.viking-callout-info) .viking-callout-icon {
        color: var(--viking-info);
      }
      :host(.viking-callout-success) {
        background: color-mix(
          in srgb,
          var(--viking-success) 10%,
          var(--viking-surface)
        );
      }
      :host(.viking-callout-success) .viking-callout-icon {
        color: var(--viking-success);
      }
      :host(.viking-callout-warning) {
        background: color-mix(
          in srgb,
          var(--viking-warning) 12%,
          var(--viking-surface)
        );
      }
      :host(.viking-callout-warning) .viking-callout-icon {
        color: var(--viking-warning);
      }
      :host(.viking-callout-danger) {
        background: color-mix(
          in srgb,
          var(--viking-danger) 16%,
          var(--viking-surface)
        );
        color: var(--viking-white);
      }
      :host(.viking-callout-danger) .viking-callout-icon {
        color: var(--viking-crimson-400);
      }
      :host(.viking-callout-danger) .viking-callout-text {
        color: var(--viking-white);
      }
      .viking-callout-body {
        flex: 1;
        min-width: 0;
        display: grid;
        gap: var(--viking-space-1); /* Consistent typography spacing */
      }
      .viking-callout-heading {
        margin: 0;
        font-size: var(--viking-font-size);
        font-weight: var(--viking-font-weight-semibold);
        color: var(--viking-text);
        line-height: var(--viking-line-height-tight);
      }
      .viking-callout-text {
        color: var(--viking-text-muted);
        line-height: var(--viking-line-height-relaxed);
        font-size: var(--viking-font-size-sm);
      }
      .viking-callout-close {
        border: none;
        background: transparent;
        color: var(--viking-text-muted);
        cursor: pointer;
        padding: var(--viking-space-half);
        border-radius: var(--viking-radius);
        display: inline-flex;
        transition: var(--viking-transition-interactive);
      }
      .viking-callout-close:hover {
        color: var(--viking-text);
        background: color-mix(in srgb, currentColor 8%, transparent);
      }
      .viking-callout-close:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: 1px;
      }
    `,
  ],
})
export class VikingCallout {
  readonly tone = input<VikingTone>("accent");
  readonly heading = input<string>("");
  readonly icon = input<VikingIconName | null>(null);
  readonly dismissible = input<boolean>(false);

  readonly closed = output<void>();

  protected readonly dismissed = signal(false);
  protected readonly resolvedIcon = computed<VikingIconName>(
    () => this.icon() ?? TONE_ICONS[this.tone()] ?? "info",
  );

  protected dismiss = (): void => {
    this.dismissed.set(true);
    this.closed.emit();
  };
}
