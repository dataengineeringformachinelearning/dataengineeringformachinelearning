import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { VikingIcon } from '../icon/icon';
import { VikingIconName } from '../core/icons';
import { VikingSize } from '../core/types';

export type VikingButtonVariant =
  | 'outline'
  | 'primary'
  | 'secondary'
  | 'filled'
  | 'danger'
  | 'ghost'
  | 'subtle';

/**
 * viking-button — composable button.
 * Variants: outline (default), primary, filled, danger, ghost, subtle.
 */
@Component({
  selector: 'viking-button',
  imports: [VikingIcon, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.pointer-events]': "disabled() ? 'none' : null",
    '[class.viking-full]': 'fullWidth()',
  },
  template: `
    <ng-template #content>
      @if (loading()) {
        <viking-icon name="loader" [size]="iconSize()" [spin]="true" />
      } @else if (icon()) {
        <viking-icon [name]="icon()!" [size]="iconSize()" />
      }
      <span class="viking-btn-label"><ng-content /></span>
      @if (iconTrailing()) {
        <viking-icon [name]="iconTrailing()!" [size]="iconSize()" />
      }
      @if (kbd()) {
        <kbd class="viking-btn-kbd">{{ kbd() }}</kbd>
      }
    </ng-template>

    @if (href()) {
      <a
        class="viking-btn"
        [class]="classes()"
        [href]="href()"
        [attr.target]="target()"
        [attr.aria-label]="label() || null"
        [attr.rel]="target() === '_blank' ? 'noopener noreferrer' : null"
      >
        <ng-container *ngTemplateOutlet="content"></ng-container>
      </a>
    } @else {
      <button
        class="viking-btn"
        [class]="classes()"
        [type]="type()"
        [disabled]="disabled() || loading()"
        [attr.aria-label]="label() || null"
        [attr.aria-busy]="loading() ? 'true' : null"
        (click)="pressed.emit($event)"
      >
        <ng-container *ngTemplateOutlet="content"></ng-container>
      </button>
    }
  `,
  styleUrl: './button.scss',
})
export class VikingButton {
  readonly variant = input<VikingButtonVariant>('outline');
  readonly size = input<VikingSize>('base');
  readonly type = input<'button' | 'submit'>('button');
  readonly icon = input<VikingIconName | null>(null);
  readonly iconTrailing = input<VikingIconName | null>(null);
  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly square = input<boolean>(false);
  /** Stretch button to 100% of container width. */
  readonly fullWidth = input<boolean>(false);
  readonly href = input<string | null>(null);
  readonly target = input<string | null>(null);
  readonly kbd = input<string | null>(null);
  /** Accessible name; required for icon-only (square) buttons. */
  readonly label = input<string>('');

  readonly pressed = output<MouseEvent>();

  protected readonly iconSize = computed(() => (this.size() === 'base' ? 22 : 18));
  protected readonly classes = computed(() => ({
    [`viking-${this.variant()}`]: true,
    [`viking-${this.size()}`]: this.size() !== 'base',
    'viking-square': this.square(),
  }));
}
