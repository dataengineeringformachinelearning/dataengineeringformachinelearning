import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { VikingIcon } from '../icon/icon';
import { VikingIconName } from '../core/icons';

/**
 * viking-empty-state — reusable empty / zero-data placeholder.
 */
@Component({
  selector: 'viking-empty-state',
  imports: [VikingIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'status' },
  template: `
    <div class="viking-empty-state-inner">
      @if (icon()) {
        <div class="viking-empty-state-icon" aria-hidden="true">
          <viking-icon [name]="icon()!" [size]="iconSize()" />
        </div>
      }
      @if (heading()) {
        <p class="viking-empty-state-heading">{{ heading() }}</p>
      }
      @if (description()) {
        <p class="viking-empty-state-description">{{ description() }}</p>
      }
      <div class="viking-empty-state-actions">
        <ng-content />
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        padding: var(--viking-space-4) var(--viking-space-3);
        font-family: var(--viking-font-family);
        animation: viking-fade-in var(--viking-duration) var(--viking-ease-default);
      }
      .viking-empty-state-inner {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        gap: 0;
        max-width: 28rem;
      }
      .viking-empty-state-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: var(--viking-space-6);
        height: var(--viking-space-6);
        border-radius: var(--viking-radius-lg);
        background: var(--viking-accent-soft);
        color: var(--viking-accent-strong);
        box-shadow: var(--viking-shadow-sm);
        margin-bottom: var(--viking-space-2);
      }
      .viking-empty-state-heading {
        margin: 0 0 var(--viking-space-1) 0;
        font-size: var(--viking-font-size-md);
        font-weight: var(--viking-font-weight-semibold);
        letter-spacing: var(--viking-letter-spacing-tight);
        color: var(--viking-text);
        line-height: var(--viking-line-height-tight);
      }
      .viking-empty-state-description {
        margin: 0;
        font-size: var(--viking-font-size);
        color: var(--viking-text-muted);
        line-height: var(--viking-line-height-relaxed);
      }
      .viking-empty-state-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: var(--viking-space-2);
        margin-top: var(--viking-space-2);
      }
      .viking-empty-state-actions:empty {
        display: none;
      }
    `,
  ],
})
export class VikingEmptyState {
  readonly heading = input<string>('');
  readonly description = input<string>('');
  readonly icon = input<VikingIconName | null>('folder');
  readonly iconSize = input<number>(28);
}
