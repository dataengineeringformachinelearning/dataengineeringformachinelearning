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
        font-weight: var(--viking-font-weight-semibold);
        letter-spacing: var(--viking-letter-spacing-wide);
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
        transition: var(--viking-transition-interactive);
        width: auto;
        min-width: var(--viking-btn-min-width, 120px);
        white-space: nowrap;
        position: relative;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
      }
      :host(.viking-full) .viking-btn {
        min-width: 0;
      }
      .viking-btn:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
      .viking-btn:disabled,
      .viking-btn[aria-busy='true'] {
        opacity: var(--viking-state-disabled-opacity);
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }
      .viking-btn[aria-busy='true'] .viking-btn-label {
        opacity: 0.85;
      }
      .viking-sm {
        min-height: var(--viking-control-height-sm);
        padding: 0 var(--viking-space-2);
        font-size: var(--viking-font-size-xs);
      }
      .viking-xs {
        min-height: var(--viking-control-height-xs);
        padding: 0 var(--viking-space-1);
        font-size: var(--viking-font-size-xs);
        min-width: auto;
      }
      .viking-square {
        width: var(--viking-control-height);
        min-width: var(--viking-control-height);
        padding: 0;
      }
      .viking-square.viking-sm {
        width: var(--viking-control-height-sm);
        min-width: var(--viking-control-height-sm);
      }
      .viking-square.viking-xs {
        width: var(--viking-control-height-xs);
        min-width: var(--viking-control-height-xs);
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
      .viking-outline:hover:not(:disabled):not([aria-busy='true']) {
        background: var(--viking-surface-alt);
        border-color: var(--viking-accent-strong);
        box-shadow: var(--viking-shadow-md);
        transform: translateY(var(--viking-state-hover-lift));
      }
      .viking-outline:active:not(:disabled):not([aria-busy='true']) {
        transform: translateY(0) scale(var(--viking-state-active-scale));
        box-shadow: var(--viking-shadow-sm);
      }
      .viking-primary {
        background: var(--viking-accent);
        color: var(--viking-accent-content);
        border-color: color-mix(in srgb, var(--viking-accent) 80%, var(--viking-black));
        box-shadow: var(--viking-shadow-sm);
      }
      .viking-primary:hover:not(:disabled):not([aria-busy='true']) {
        background: var(--viking-accent-hover);
        border-color: var(--viking-accent-hover);
        box-shadow: var(--viking-shadow-hover);
        transform: translateY(var(--viking-state-hover-lift));
      }
      .viking-primary:active:not(:disabled):not([aria-busy='true']) {
        transform: translateY(0) scale(var(--viking-state-active-scale));
        box-shadow: var(--viking-shadow-sm);
      }
      .viking-secondary {
        background: var(--viking-accent-secondary);
        color: var(--viking-accent-secondary-content);
        border-color: color-mix(in srgb, var(--viking-accent-secondary) 80%, var(--viking-black));
        box-shadow: var(--viking-shadow-sm);
      }
      .viking-secondary:hover:not(:disabled):not([aria-busy='true']) {
        background: var(--viking-accent-secondary-hover);
        border-color: var(--viking-accent-secondary-hover);
        box-shadow: var(--viking-shadow-hover);
        transform: translateY(var(--viking-state-hover-lift));
      }
      .viking-secondary:active:not(:disabled):not([aria-busy='true']) {
        transform: translateY(0) scale(var(--viking-state-active-scale));
        box-shadow: var(--viking-shadow-sm);
      }
      .viking-filled {
        background: var(--viking-surface-alt);
        color: var(--viking-text);
        border-color: var(--viking-border);
        box-shadow: var(--viking-shadow-xs);
      }
      .viking-filled:hover:not(:disabled):not([aria-busy='true']) {
        border-color: var(--viking-accent-strong);
        background: color-mix(in srgb, var(--viking-accent) 8%, var(--viking-surface-alt));
        box-shadow: var(--viking-shadow-sm);
      }
      .viking-filled:active:not(:disabled):not([aria-busy='true']) {
        transform: scale(var(--viking-state-active-scale));
      }
      .viking-danger {
        background: var(--viking-danger);
        color: var(--viking-on-danger);
        border-color: color-mix(in srgb, var(--viking-danger) 85%, var(--viking-black));
        box-shadow: var(--viking-shadow-sm);
      }
      .viking-danger:hover:not(:disabled):not([aria-busy='true']) {
        background: color-mix(in srgb, var(--viking-danger) 88%, var(--viking-white));
        box-shadow: var(--viking-shadow-hover);
        transform: translateY(var(--viking-state-hover-lift));
      }
      .viking-danger:active:not(:disabled):not([aria-busy='true']) {
        transform: translateY(0) scale(var(--viking-state-active-scale));
      }
      .viking-ghost {
        background: transparent;
        color: var(--viking-text);
        min-width: auto;
      }
      .viking-ghost:hover:not(:disabled):not([aria-busy='true']) {
        background: var(--viking-accent-soft);
        color: var(--viking-accent-strong);
      }
      .viking-ghost:active:not(:disabled):not([aria-busy='true']) {
        transform: scale(var(--viking-state-active-scale));
      }
      .viking-subtle {
        background: transparent;
        color: var(--viking-text-muted);
        border-color: var(--viking-border-subtle);
        min-width: auto;
      }
      .viking-subtle:hover:not(:disabled):not([aria-busy='true']) {
        color: var(--viking-text);
        background: var(--viking-accent-soft);
        border-color: var(--viking-border-strong);
      }
      .viking-subtle:active:not(:disabled):not([aria-busy='true']) {
        transform: scale(var(--viking-state-active-scale));
      }

      .viking-btn-kbd {
        font-family: var(--viking-font-family-mono);
        font-size: var(--viking-font-size-xs);
        color: var(--viking-text-muted);
        background: var(--viking-surface-alt);
        border: 1px solid var(--viking-border);
        border-radius: var(--viking-radius-xs);
        padding: 0 var(--viking-space-half);
        line-height: 1.4;
        margin-left: var(--viking-space-half);
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
