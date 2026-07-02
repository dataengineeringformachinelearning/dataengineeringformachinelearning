import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { VikingIcon } from '../icon/icon';
import { VikingIconName } from '../core/icons';
import { VikingSize } from '../core/types';

export type VikingButtonVariant = 'outline' | 'primary' | 'filled' | 'danger' | 'ghost' | 'subtle';

/**
 * viking-button — composable button (https://fluxui.dev/components/button).
 * Variants: outline (default), primary, filled, danger, ghost, subtle.
 */
@Component({
  selector: 'viking-button',
  imports: [VikingIcon, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.pointer-events]': "disabled() ? 'none' : null" },
  template: `
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
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      :host(.viking-full) {
        display: flex;
      }
      :host(.viking-full) .viking-btn {
        width: 100%;
      }
      .viking-btn {
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-ui);
        font-weight: 700;
        letter-spacing: 0.01em;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--viking-space-1);
        min-height: var(--viking-control-height);
        padding: 0 var(--viking-control-padding-x);
        border-radius: var(--viking-radius);
        border: 1px solid transparent;
        cursor: pointer;
        text-decoration: none;
        transition: var(--viking-transition);
        width: auto;
        min-width: var(--viking-btn-min-width, 120px);
        white-space: nowrap;
      }
      :host(.viking-full) .viking-btn {
        min-width: 0;
      }
      .viking-btn:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .viking-sm {
        min-height: var(--viking-control-height-sm);
        padding: 0 var(--viking-space-2);
      }
      .viking-xs {
        min-height: var(--viking-control-height-xs);
        padding: 0 var(--viking-space-1);
      }
      .viking-square {
        width: var(--viking-control-height);
        padding: 0;
      }
      .viking-square.viking-sm {
        width: var(--viking-control-height-sm);
      }
      .viking-square.viking-xs {
        width: var(--viking-control-height-xs);
      }
      .viking-square .viking-btn-label {
        display: none;
      }

      .viking-outline {
        background: var(--viking-surface);
        color: var(--viking-text);
        border-color: var(--viking-border-strong);
        box-shadow: var(--viking-shadow-sm);
      }
      .viking-outline:hover:not(:disabled) {
        background: var(--viking-surface-alt);
        border-color: var(--viking-accent-strong);
      }
      .viking-primary {
        background: var(--viking-accent);
        color: var(--viking-accent-content);
        border-color: var(--viking-accent);
        box-shadow: var(--viking-shadow-sm);
      }
      .viking-primary:hover:not(:disabled) {
        background: var(--viking-accent-strong);
        border-color: var(--viking-accent-strong);
        border-bottom-color: var(--hover-color, #fdca40);
      }
      .viking-filled {
        background: var(--viking-surface-alt);
        color: var(--viking-text);
        border-color: var(--viking-border);
      }
      .viking-filled:hover:not(:disabled) {
        border-color: var(--viking-accent-strong);
      }
      .viking-danger {
        background: var(--viking-danger);
        color: var(--viking-on-danger, #31393c);
        border-color: var(--viking-danger);
      }
      .viking-danger:hover:not(:disabled) {
        opacity: 0.9;
      }
      .viking-ghost {
        background: transparent;
        color: var(--viking-text);
      }
      .viking-ghost:hover:not(:disabled) {
        background: var(--viking-accent-soft);
      }
      .viking-subtle {
        background: transparent;
        color: var(--viking-text-muted);
        border-color: var(--viking-border);
      }
      .viking-subtle:hover:not(:disabled) {
        color: var(--viking-text);
        background: var(--viking-accent-soft);
        border-color: var(--viking-border-strong);
      }

      .viking-btn-kbd {
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-ui);
        color: var(--viking-text-muted);
        background: var(--viking-surface-alt);
        border: 1px solid var(--viking-border);
        border-radius: calc(var(--viking-radius) / 2);
        padding: 0 var(--viking-space-1);
        line-height: 1.4;
      }
    `,
  ],
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
