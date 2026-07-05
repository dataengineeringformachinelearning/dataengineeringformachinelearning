import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { VikingIconBadge } from '../icon-badge/icon-badge';
import { VikingIconName } from '../core/icons';

export type VikingChartEmptyTone = 'default' | 'secure';
export type VikingChartEmptyLayout = 'fill' | 'overlay' | 'compact' | 'inline';

/**
 * viking-chart-empty-state — standardized dashed “waiting for data” overlay for chart panels.
 * Fills its parent chart body by default; use layout="overlay" for map/canvas stacks.
 */
@Component({
  selector: 'viking-chart-empty-state',
  imports: [VikingIconBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'status',
    class: 'viking-chart-empty-state empty-chart-state',
    '[class.is-secure]': "tone() === 'secure'",
    '[class.compact]': "layout() === 'compact'",
    '[class.viking-chart-empty-overlay]': "layout() === 'overlay'",
    '[class.viking-chart-empty-fill]': "layout() === 'fill'",
    '[class.viking-chart-empty-inline]': "layout() === 'inline'",
  },
  template: `
    <viking-icon-badge [icon]="icon()" [tone]="tone() === 'secure' ? 'success' : 'default'" />
    <h3 class="empty-title">{{ title() }}</h3>
    <p class="empty-subtitle">{{ description() }}</p>
    <div class="viking-chart-empty-actions">
      <ng-content />
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        width: 100%;
        box-sizing: border-box;
        padding: var(--viking-space-4) var(--viking-space-3);
        border-radius: var(--viking-radius-lg);
        background: var(--viking-surface-alt);
        border: 1px dashed var(--viking-border-strong);
        box-shadow: var(--viking-shadow-inner);
        gap: var(--viking-space-2);
        animation: viking-fade-in var(--viking-duration) var(--viking-ease-default);
      }

      :host(.viking-chart-empty-fill) {
        flex: 1 1 auto;
        min-height: var(
          --viking-chart-empty-min-height,
          var(--viking-chart-fill-min-height, clamp(16rem, 32vw, 17.5rem))
        );
      }

      viking-icon-badge {
        margin-bottom: var(--viking-space-2);
      }

      .empty-title {
        margin: 0 0 var(--viking-space-1) 0;
        font-size: var(--viking-font-size-md);
        font-weight: var(--viking-font-weight-semibold);
        letter-spacing: var(--viking-letter-spacing-caps);
        text-transform: uppercase;
        color: var(--viking-text);
        line-height: var(--viking-line-height-tight);
      }

      :host(.viking-chart-empty-overlay) {
        position: absolute;
        inset: 0;
        z-index: 1;
        min-height: 100%;
        margin: 0;
        background: color-mix(in srgb, var(--viking-surface-alt) 94%, transparent);
      }

      :host(.compact) {
        min-height: 160px;
        padding: var(--viking-space-3);
      }

      :host(.viking-chart-empty-inline) {
        border: none;
        background: transparent;
        box-shadow: none;
        min-height: auto;
        flex: 1 1 auto;
        justify-content: center;
        padding: var(--viking-space-4) var(--viking-space-2);
      }

      :host(.is-secure) .viking-icon-badge {
        background: color-mix(in srgb, var(--viking-success) 14%, transparent);
        color: var(--viking-success);
      }

      .empty-subtitle {
        margin: 0;
        font-size: var(--viking-font-size);
        color: var(--viking-text-muted);
        line-height: var(--viking-line-height-relaxed);
        max-width: 28rem;
      }

      .viking-chart-empty-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: var(--viking-space-2);
        margin-top: var(--viking-space-2);
      }

      .viking-chart-empty-actions:empty {
        display: none;
      }

      @media (prefers-reduced-motion: reduce) {
        :host {
          animation: none;
        }
      }
    `,
  ],
})
export class VikingChartEmptyState {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly icon = input<VikingIconName>('globe');
  readonly tone = input<VikingChartEmptyTone>('default');
  readonly layout = input<VikingChartEmptyLayout>('fill');
}
