import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FluxIcon } from '../icon/icon';
import { FluxIconName } from '../core/icons';
import { FluxSize } from '../core/types';

export type FluxButtonVariant = 'outline' | 'primary' | 'filled' | 'danger' | 'ghost' | 'subtle';

/**
 * flux-button — composable button (https://fluxui.dev/components/button).
 * Variants: outline (default), primary, filled, danger, ghost, subtle.
 */
@Component({
  selector: 'flux-button',
  imports: [FluxIcon, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.pointer-events]': "disabled() ? 'none' : null" },
  template: `
    @if (href()) {
      <a
        class="flux-btn"
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
        class="flux-btn"
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
        <flux-icon name="loader" [size]="iconSize()" [spin]="true" />
      } @else if (icon()) {
        <flux-icon [name]="icon()!" [size]="iconSize()" />
      }
      <span class="flux-btn-label"><ng-content /></span>
      @if (iconTrailing()) {
        <flux-icon [name]="iconTrailing()!" [size]="iconSize()" />
      }
      @if (kbd()) {
        <kbd class="flux-btn-kbd">{{ kbd() }}</kbd>
      }
    </ng-template>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      :host(.flux-full) {
        display: flex;
      }
      :host(.flux-full) .flux-btn {
        width: 100%;
      }
      .flux-btn {
        font-family: var(--flux-font-family);
        /* >= 18.67px bold qualifies as WCAG large text (3:1 on accent fills). */
        font-size: calc(var(--flux-font-size) * 1.05);
        font-weight: 700;
        letter-spacing: 0.01em;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--flux-space-1);
        min-height: var(--flux-control-height);
        padding: 0 var(--flux-control-padding-x);
        border-radius: var(--flux-radius);
        border: 1px solid transparent;
        cursor: pointer;
        text-decoration: none;
        transition: var(--flux-transition);
        width: auto;
        white-space: nowrap;
      }
      .flux-btn:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: var(--flux-ring-offset);
      }
      .flux-btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .flux-sm {
        min-height: var(--flux-control-height-sm);
        padding: 0 var(--flux-space-2);
      }
      .flux-xs {
        min-height: var(--flux-control-height-xs);
        padding: 0 var(--flux-space-1);
      }
      .flux-square {
        width: var(--flux-control-height);
        padding: 0;
      }
      .flux-square.flux-sm {
        width: var(--flux-control-height-sm);
      }
      .flux-square.flux-xs {
        width: var(--flux-control-height-xs);
      }
      .flux-square .flux-btn-label {
        display: none;
      }

      .flux-outline {
        background: var(--flux-surface);
        color: var(--flux-text);
        border-color: var(--flux-border-strong);
        box-shadow: var(--flux-shadow-sm);
      }
      .flux-outline:hover:not(:disabled) {
        background: var(--flux-surface-alt);
        border-color: var(--flux-accent-strong);
      }
      .flux-primary {
        background: var(--flux-accent);
        color: var(--flux-accent-content);
        border-color: var(--flux-accent);
        box-shadow: var(--flux-shadow-sm);
      }
      .flux-primary:hover:not(:disabled) {
        background: var(--flux-accent-strong);
        border-color: var(--flux-accent-strong);
        border-bottom-color: var(--hover-color, #fdca40);
      }
      .flux-filled {
        background: var(--flux-surface-alt);
        color: var(--flux-text);
        border-color: var(--flux-border);
      }
      .flux-filled:hover:not(:disabled) {
        border-color: var(--flux-accent-strong);
      }
      .flux-danger {
        background: var(--flux-danger);
        color: var(--flux-on-danger, #31393c);
        border-color: var(--flux-danger);
      }
      .flux-danger:hover:not(:disabled) {
        opacity: 0.9;
      }
      .flux-ghost {
        background: transparent;
        color: var(--flux-text);
      }
      .flux-ghost:hover:not(:disabled) {
        background: var(--flux-accent-soft);
      }
      .flux-subtle {
        background: transparent;
        color: var(--flux-text-muted);
        border-color: var(--flux-border);
      }
      .flux-subtle:hover:not(:disabled) {
        color: var(--flux-text);
        background: var(--flux-accent-soft);
        border-color: var(--flux-border-strong);
      }

      .flux-btn-kbd {
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
        color: var(--flux-text-muted);
        background: var(--flux-surface-alt);
        border: 1px solid var(--flux-border);
        border-radius: calc(var(--flux-radius) / 2);
        padding: 0 var(--flux-space-1);
        line-height: 1.4;
      }
    `,
  ],
})
export class FluxButton {
  readonly variant = input<FluxButtonVariant>('outline');
  readonly size = input<FluxSize>('base');
  readonly type = input<'button' | 'submit'>('button');
  readonly icon = input<FluxIconName | null>(null);
  readonly iconTrailing = input<FluxIconName | null>(null);
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
    [`flux-${this.variant()}`]: true,
    [`flux-${this.size()}`]: this.size() !== 'base',
    'flux-square': this.square(),
  }));
}
