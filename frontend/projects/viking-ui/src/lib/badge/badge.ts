import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { VikingIcon } from '../icon/icon';
import { VikingIconName } from '../core/icons';
import { VikingSize, VikingTone } from '../core/types';

/**
 * viking-badge — status pill (https://fluxui.dev/components/badge).
 * Tones map to THEME.md semantic colors only.
 */
@Component({
  selector: 'viking-badge',
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'hostClass()' },
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
        gap: calc(var(--viking-space-1) / 1.5);
        font-family: var(--viking-font-family);
        font-size: var(--viking-font-size-ui);
        font-weight: 700;
        line-height: 1.3;
        padding: calc(var(--viking-space-1) / 3) var(--viking-space-1);
        border-radius: var(--viking-radius-pill);
        border: 1px solid var(--viking-border);
        background: var(--viking-surface-alt);
        color: var(--viking-text);
        white-space: nowrap;
      }
      :host(.viking-badge-sm) {
        padding: 0 var(--viking-space-1);
      }
      :host(.viking-badge-accent) {
        background: var(--viking-accent);
        border-color: var(--viking-accent);
        color: var(--viking-accent-content);
      }
      :host(.viking-badge-success) {
        background: color-mix(in srgb, var(--viking-success) 18%, transparent);
        border-color: var(--viking-success);
        color: var(--viking-text);
      }
      :host(.viking-badge-warning) {
        background: color-mix(in srgb, var(--viking-warning) 22%, transparent);
        border-color: var(--viking-warning);
        color: var(--viking-text);
      }
      :host(.viking-badge-danger) {
        background: color-mix(in srgb, var(--viking-danger) 18%, transparent);
        border-color: var(--viking-danger);
        color: var(--viking-text);
      }
      :host(.viking-badge-muted) {
        color: var(--viking-text-muted);
      }
      .viking-badge-remove {
        display: inline-flex;
        align-items: center;
        border: none;
        background: transparent;
        color: currentColor;
        cursor: pointer;
        padding: 2px;
        border-radius: var(--viking-radius-pill);
      }
      .viking-badge-remove:hover {
        background: var(--viking-accent-soft);
      }
      .viking-badge-remove:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: 1px;
      }
    `,
  ],
})
export class VikingBadge {
  readonly tone = input<VikingTone | 'neutral'>('neutral');
  readonly size = input<VikingSize>('base');
  readonly icon = input<VikingIconName | null>(null);
  readonly removable = input<boolean>(false);

  readonly removed = output<void>();

  protected readonly hostClass = computed(() => ({
    [`viking-badge-${this.tone()}`]: this.tone() !== 'neutral',
    'viking-badge-sm': this.size() !== 'base',
  }));
}
