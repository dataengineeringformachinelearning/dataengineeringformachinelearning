import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from "@angular/core";
import { NgTemplateOutlet } from "@angular/common";
import { VikingIcon } from "../icon/icon";
import { VikingIconName } from "../../core/icons";
import { safeHref } from "../../core/safe-href";
import { VikingSize } from "../../core/types";

export type VikingButtonVariant =
  | "outline"
  | "primary"
  | "secondary"
  | "filled"
  | "danger"
  | "ghost"
  | "subtle";

/**
 * viking-button — single native control (button or anchor). No nested WC button.
 * Static/marketing surfaces still use `viking-button-wc` where Angular is unavailable.
 * Variants: outline (default), primary, filled, danger, ghost, subtle.
 */
@Component({
  selector: "viking-button",
  imports: [NgTemplateOutlet, VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[class.viking-full]": "fullWidth()",
    "[class.viking-compact]": "compact()",
    // Host is presentational — interactive ARIA lives on the native control
    role: "presentation",
  },
  template: `
    <ng-template #controlContent>
      @if (loading()) {
        <span class="viking-btn-spinner" aria-hidden="true"></span>
      } @else if (icon()) {
        <viking-icon [name]="icon()!" [size]="iconSize()" />
      }
      <span class="viking-btn-label">
        @if (label()) {
          {{ label() }}
        } @else {
          <ng-content />
        }
      </span>
      @if (!loading() && iconTrailing()) {
        <viking-icon [name]="iconTrailing()!" [size]="iconSize()" />
      }
      @if (kbd()) {
        <kbd class="viking-btn-kbd">{{ kbd() }}</kbd>
      }
    </ng-template>

    @if (safeUrl()) {
      <a
        class="suite-btn viking-btn"
        [class]="controlClass()"
        [attr.data-variant]="suiteVariant()"
        [attr.href]="isInteractive() ? safeUrl() : null"
        [attr.target]="target()"
        [attr.rel]="relAttr()"
        [attr.aria-label]="accessibleName()"
        [attr.aria-busy]="loading() ? 'true' : null"
        [attr.aria-expanded]="ariaExpanded()"
        [attr.aria-controls]="ariaControls()"
        [attr.aria-haspopup]="ariaHaspopup()"
        [attr.aria-pressed]="ariaPressed()"
        [attr.aria-current]="ariaCurrent()"
        [attr.aria-disabled]="!isInteractive() ? 'true' : null"
        [attr.tabindex]="!isInteractive() ? -1 : null"
        (click)="onClick($event)"
      >
        <ng-container [ngTemplateOutlet]="controlContent" />
      </a>
    } @else {
      <button
        class="suite-btn viking-btn"
        [class]="controlClass()"
        [attr.data-variant]="suiteVariant()"
        [type]="type()"
        [disabled]="!isInteractive()"
        [attr.aria-label]="accessibleName()"
        [attr.aria-busy]="loading() ? 'true' : null"
        [attr.aria-expanded]="ariaExpanded()"
        [attr.aria-controls]="ariaControls()"
        [attr.aria-haspopup]="ariaHaspopup()"
        [attr.aria-pressed]="ariaPressed()"
        [attr.aria-current]="ariaCurrent()"
        (click)="onClick($event)"
      >
        <ng-container [ngTemplateOutlet]="controlContent" />
      </button>
    }
  `,
  styleUrl: "./button.scss",
})
export class VikingButton {
  readonly variant = input<VikingButtonVariant>("outline");
  readonly size = input<VikingSize>("base");
  readonly type = input<"button" | "submit">("button");
  readonly icon = input<VikingIconName | null>(null);
  readonly iconTrailing = input<VikingIconName | null>(null);
  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly square = input<boolean>(false);
  readonly fullWidth = input<boolean>(false);
  readonly compact = input<boolean>(false);
  readonly href = input<string | null>(null);
  readonly target = input<string | null>(null);
  readonly kbd = input<string | null>(null);
  readonly label = input<string>("");
  /** Forwarded onto the native control (host attrs alone are invisible to AT). */
  readonly ariaExpanded = input<boolean | string | null>(null, {
    alias: "aria-expanded",
  });
  readonly ariaControls = input<string | null>(null, {
    alias: "aria-controls",
  });
  readonly ariaHaspopup = input<boolean | string | null>(null, {
    alias: "aria-haspopup",
  });
  readonly ariaPressed = input<boolean | string | null>(null, {
    alias: "aria-pressed",
  });
  readonly ariaCurrent = input<string | null>(null, { alias: "aria-current" });

  readonly pressed = output<MouseEvent>();

  protected readonly iconSize = computed(() =>
    this.size() === "base" ? 20 : 18,
  );

  /**
   * Voice/switch: square buttons hide the text label — always expose a name.
   * Prefer explicit `label`; fall back to a humanized icon name for icon-only.
   */
  protected readonly accessibleName = computed(() => {
    const explicit = this.label().trim();
    if (explicit) return explicit;
    if (this.square()) {
      const icon = this.icon();
      if (icon) return icon.replace(/-/g, " ");
    }
    return null;
  });

  protected readonly isInteractive = computed(
    () => !this.disabled() && !this.loading(),
  );

  protected readonly controlClass = computed(() => {
    const size = this.size();
    return {
      [`viking-btn-${this.variant()}`]: true,
      [`viking-btn-${size}`]: size !== "base",
      "viking-btn-square": this.square(),
      "viking-full": this.fullWidth(),
      "viking-compact": this.compact(),
    };
  });

  /** Maps filled/subtle → suite data-variant contract used by forjd-ui. */
  protected readonly suiteVariant = computed(() => {
    const v = this.variant();
    if (v === "filled") return "primary";
    if (v === "subtle") return "ghost";
    return v;
  });

  protected readonly relAttr = computed(() =>
    this.target() === "_blank" ? "noopener noreferrer" : null,
  );

  /** Drop javascript:/data:/protocol-relative hrefs (FORJD ADR-0013). */
  protected readonly safeUrl = computed(() => safeHref(this.href()));

  protected onClick = (event: MouseEvent): void => {
    if (!this.isInteractive()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.pressed.emit(event);
  };
}
