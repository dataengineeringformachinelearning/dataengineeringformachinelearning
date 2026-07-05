import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from "@angular/core";
import { VikingTone } from "../../core/types";

/**
 * viking-avatar — image or initials avatar with optional status indicator
 *.
 */
@Component({
  selector: "viking-avatar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[style.width.px]": "size()",
    "[style.height.px]": "size()",
    "[class.viking-avatar-square]": "square()",
  },
  template: `
    @if (src() && !imageFailed()) {
      <img [src]="src()" [alt]="name()" (error)="imageFailed.set(true)" />
    } @else {
      <span class="viking-avatar-initials">
        {{ initials() }}
      </span>
    }
    @if (status()) {
      <span
        class="viking-avatar-status"
        [class]="'viking-status-' + status()"
        role="status"
      >
        <span class="viking-visually-hidden">{{ status() }}</span>
      </span>
    }
  `,
  styles: [
    `
      :host {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--viking-radius-pill);
        background: var(--viking-surface-alt);
        border: 1px solid var(--viking-border);
        overflow: visible;
        flex-shrink: 0;
      }
      :host(.viking-avatar-square) {
        border-radius: var(--viking-radius);
      }
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: inherit;
      }
      .viking-avatar-initials {
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-ui);
        font-weight: 600;
        color: var(--viking-text);
        text-transform: uppercase;
        letter-spacing: 0.02em;
        user-select: none;
      }
      .viking-avatar-status {
        position: absolute;
        right: -1px;
        bottom: -1px;
        width: 27%;
        height: 27%;
        min-width: 9px;
        min-height: 9px;
        border-radius: var(--viking-radius-pill);
        border: 2px solid var(--viking-surface);
      }
      .viking-status-success {
        background: var(--viking-success);
      }
      .viking-status-warning {
        background: var(--viking-warning);
      }
      .viking-status-danger {
        background: var(--viking-danger);
      }
      .viking-status-accent {
        background: var(--viking-accent);
      }
      .viking-status-muted {
        background: var(--viking-text-muted);
      }
      .viking-visually-hidden {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }
    `,
  ],
})
export class VikingAvatar {
  readonly src = input<string | null>(null);
  readonly name = input<string>("");
  readonly size = input<number>(45);
  readonly square = input<boolean>(false);
  readonly status = input<VikingTone | null>(null);

  protected readonly imageFailed = signal(false);

  protected readonly initials = computed(() => {
    const parts = this.name().trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return "?";
    }
    const first = parts[0].charAt(0);
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
    return `${first}${last}`;
  });
}
