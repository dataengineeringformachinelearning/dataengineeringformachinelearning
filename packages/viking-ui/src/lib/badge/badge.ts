import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from "@angular/core";
import { VikingIcon } from "../icon/icon";
import { VikingIconName } from "../../core/icons";
import { VikingSize, VikingTone } from "../../core/types";

/**
 * viking-badge — status pill.
 * Tones map to THEME.md semantic colors only.
 */
@Component({
  selector: "viking-badge",
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { "[class]": "hostClass()" },
  template: `
    @if (icon()) {
      <viking-icon [name]="icon()!" [size]="16" />
    }
    <ng-content />
    @if (removable()) {
      <button
        type="button"
        class="viking-badge-remove"
        aria-label="Remove"
        (click)="removed.emit()"
      >
        <viking-icon name="x" [size]="14" />
      </button>
    }
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        gap: var(--viking-space-half);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-xs);
        font-weight: var(--viking-font-weight-semibold);
        letter-spacing: var(--viking-letter-spacing-wide);
        line-height: var(--viking-line-height-snug);
        padding: var(--viking-space-half) var(--viking-space-1);
        border-radius: var(--viking-radius-pill);
        border: 1px solid var(--viking-border);
        background: var(--viking-surface-alt);
        color: var(--viking-text);
        white-space: nowrap;
        transition: var(--viking-transition-interactive);
        box-shadow: var(--viking-shadow-xs);
      }
      :host(.viking-badge-sm) {
        padding: 0 var(--viking-space-1);
        font-size: var(--viking-font-size-2xs);
      }
      :host(.viking-badge-accent) {
        background: var(--viking-accent);
        border-color: color-mix(
          in srgb,
          var(--viking-accent) 80%,
          var(--viking-black)
        );
        color: var(--viking-accent-content);
        box-shadow: var(--viking-shadow-sm);
      }
      :host(.viking-badge-secondary) {
        background: color-mix(
          in srgb,
          var(--viking-accent-secondary) 16%,
          var(--viking-surface)
        );
        border-color: color-mix(
          in srgb,
          var(--viking-accent-secondary) 55%,
          transparent
        );
        color: var(--viking-accent-secondary);
      }
      :host(.viking-badge-success) {
        background: color-mix(
          in srgb,
          var(--viking-success) 16%,
          var(--viking-surface)
        );
        border-color: color-mix(
          in srgb,
          var(--viking-success) 55%,
          transparent
        );
        color: var(--viking-success);
      }
      :host(.viking-badge-warning) {
        background: color-mix(
          in srgb,
          var(--viking-warning) 18%,
          var(--viking-surface)
        );
        border-color: color-mix(
          in srgb,
          var(--viking-warning) 55%,
          transparent
        );
        color: var(--viking-warning);
      }
      :host(.viking-badge-danger) {
        background: color-mix(
          in srgb,
          var(--viking-danger) 14%,
          var(--viking-surface)
        );
        border-color: color-mix(in srgb, var(--viking-danger) 50%, transparent);
        color: var(--viking-danger-text);
      }
      :host(.viking-badge-info) {
        background: color-mix(
          in srgb,
          var(--viking-info) 14%,
          var(--viking-surface)
        );
        border-color: color-mix(in srgb, var(--viking-info) 50%, transparent);
        color: var(--viking-info);
      }
      :host(.viking-badge-muted) {
        color: var(--viking-text-muted);
        background: var(--viking-surface);
        border-color: var(--viking-border-subtle);
      }
      .viking-badge-remove {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: var(--viking-touch-target-comfort);
        min-height: var(--viking-touch-target-comfort);
        border: none;
        background: transparent;
        color: currentColor;
        cursor: pointer;
        padding: var(--viking-space-half);
        border-radius: var(--viking-radius-pill);
        transition: var(--viking-transition-interactive);
        margin-left: calc(var(--viking-space-half) * -1);
        position: relative;
      }
      .viking-badge-remove::before {
        content: "";
        position: absolute;
        inset: 50%;
        width: var(--viking-touch-target-min);
        height: var(--viking-touch-target-min);
        transform: translate(-50%, -50%);
      }
      .viking-badge-remove:hover {
        background: color-mix(in srgb, currentColor 12%, transparent);
      }
      .viking-badge-remove:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-badge-remove:active {
        transform: scale(var(--viking-state-active-scale));
      }
    `,
  ],
})
export class VikingBadge {
  readonly tone = input<VikingTone | "neutral">("neutral");
  readonly size = input<VikingSize>("base");
  readonly icon = input<VikingIconName | null>(null);
  readonly removable = input<boolean>(false);

  readonly removed = output<void>();

  protected readonly hostClass = computed(() => ({
    [`viking-badge-${this.tone()}`]: this.tone() !== "neutral",
    "viking-badge-sm": this.size() !== "base",
  }));
}
