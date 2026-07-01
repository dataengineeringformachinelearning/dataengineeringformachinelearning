import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FluxIcon } from '../icon/icon';
import { FluxIconName } from '../core/icons';
import { FluxSize, FluxTone } from '../core/types';

/**
 * flux-badge — status pill (https://fluxui.dev/components/badge).
 * Tones map to THEME.md semantic colors only.
 */
@Component({
  selector: 'flux-badge',
  imports: [FluxIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'hostClass()' },
  template: `
    @if (icon()) {
      <flux-icon [name]="icon()!" [size]="16" />
    }
    <ng-content />
    @if (removable()) {
      <button type="button" class="flux-badge-remove" aria-label="Remove" (click)="removed.emit()">
        <flux-icon name="x" [size]="14" />
      </button>
    }
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
        gap: calc(var(--flux-space-1) / 1.5);
        font-family: var(--flux-font-family);
        font-size: var(--flux-font-size);
        font-weight: 600;
        line-height: 1.3;
        padding: calc(var(--flux-space-1) / 3) var(--flux-space-1);
        border-radius: var(--flux-radius-pill);
        border: 1px solid var(--flux-border);
        background: var(--flux-surface-alt);
        color: var(--flux-text);
        white-space: nowrap;
      }
      :host(.flux-badge-sm) {
        padding: 0 var(--flux-space-1);
      }
      :host(.flux-badge-accent) {
        background: var(--flux-accent);
        border-color: var(--flux-accent);
        color: var(--flux-accent-content);
      }
      :host(.flux-badge-success) {
        background: color-mix(in srgb, var(--flux-success) 18%, transparent);
        border-color: var(--flux-success);
        color: var(--flux-text);
      }
      :host(.flux-badge-warning) {
        background: color-mix(in srgb, var(--flux-warning) 22%, transparent);
        border-color: var(--flux-warning);
        color: var(--flux-text);
      }
      :host(.flux-badge-danger) {
        background: color-mix(in srgb, var(--flux-danger) 18%, transparent);
        border-color: var(--flux-danger);
        color: var(--flux-text);
      }
      :host(.flux-badge-muted) {
        color: var(--flux-text-muted);
      }
      .flux-badge-remove {
        display: inline-flex;
        align-items: center;
        border: none;
        background: transparent;
        color: currentColor;
        cursor: pointer;
        padding: 2px;
        border-radius: var(--flux-radius-pill);
      }
      .flux-badge-remove:hover {
        background: var(--flux-accent-soft);
      }
      .flux-badge-remove:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: 1px;
      }
    `,
  ],
})
export class FluxBadge {
  readonly tone = input<FluxTone | 'neutral'>('neutral');
  readonly size = input<FluxSize>('base');
  readonly icon = input<FluxIconName | null>(null);
  readonly removable = input<boolean>(false);

  readonly removed = output<void>();

  protected readonly hostClass = computed(() => ({
    [`flux-badge-${this.tone()}`]: this.tone() !== 'neutral',
    'flux-badge-sm': this.size() !== 'base',
  }));
}
