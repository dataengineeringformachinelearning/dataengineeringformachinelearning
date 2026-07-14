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
    "[attr.aria-busy]": "loading() ? 'true' : null",
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

    @if (href()) {
      <a
        class="viking-btn"
        [class]="controlClass()"
        [attr.href]="isInteractive() ? href() : null"
        [attr.target]="target()"
        [attr.rel]="relAttr()"
        [attr.aria-label]="label() || null"
        [attr.aria-disabled]="!isInteractive() ? 'true' : null"
        [attr.tabindex]="!isInteractive() ? -1 : null"
        (click)="onClick($event)"
      >
        <ng-container [ngTemplateOutlet]="controlContent" />
      </a>
    } @else {
      <button
        class="viking-btn"
        [class]="controlClass()"
        [type]="type()"
        [disabled]="!isInteractive()"
        [attr.aria-label]="label() || null"
        [attr.aria-busy]="loading() ? 'true' : null"
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

  readonly pressed = output<MouseEvent>();

  protected readonly iconSize = computed(() =>
    this.size() === "base" ? 20 : 18,
  );

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

  protected readonly relAttr = computed(() =>
    this.target() === "_blank" ? "noopener noreferrer" : null,
  );

  protected onClick = (event: MouseEvent): void => {
    if (!this.isInteractive()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.pressed.emit(event);
  };
}
