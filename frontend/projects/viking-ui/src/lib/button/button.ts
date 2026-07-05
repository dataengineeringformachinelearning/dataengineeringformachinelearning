import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  computed,
  input,
  output,
} from '@angular/core';
import { VikingIcon } from '../icon/icon';
import { VikingIconName } from '../../../../../packages/viking-ui/src/core/icons';
import { VikingSize } from '../../../../../packages/viking-ui/src/core/types';
import { registerVikingElements } from '../../../../../packages/viking-ui/src/web/index';

registerVikingElements();

export type VikingButtonVariant =
  | 'outline'
  | 'primary'
  | 'secondary'
  | 'filled'
  | 'danger'
  | 'ghost'
  | 'subtle';

/**
 * viking-button — thin Angular wrapper around `viking-button-wc`.
 * Variants: outline (default), primary, filled, danger, ghost, subtle.
 */
@Component({
  selector: 'viking-button',
  imports: [VikingIcon],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.pointer-events]': "disabled() ? 'none' : null",
    '[class.viking-full]': 'fullWidth()',
    '[class.viking-compact]': 'compact()',
  },
  template: `
    <viking-button-wc
      [attr.variant]="variant()"
      [attr.size]="size() === 'base' ? null : size()"
      [attr.type]="type()"
      [attr.disabled]="disabled() || loading() ? '' : null"
      [attr.aria-busy]="loading() ? 'true' : null"
      [attr.href]="href()"
      [attr.target]="target()"
      [attr.aria-label]="label() || null"
      [attr.square]="square() ? '' : null"
      [attr.full-width]="fullWidth() ? '' : null"
      [attr.compact]="compact() ? '' : null"
      (viking-press)="onPress($event)"
    >
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
    </viking-button-wc>
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
  readonly fullWidth = input<boolean>(false);
  readonly compact = input<boolean>(false);
  readonly href = input<string | null>(null);
  readonly target = input<string | null>(null);
  readonly kbd = input<string | null>(null);
  readonly label = input<string>('');

  readonly pressed = output<MouseEvent>();

  protected readonly iconSize = computed(() => (this.size() === 'base' ? 22 : 18));

  protected onPress = (event: Event): void => {
    const detail = (event as CustomEvent<MouseEvent>).detail;
    if (detail) {
      this.pressed.emit(detail);
    }
  };
}
