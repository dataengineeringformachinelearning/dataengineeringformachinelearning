import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { VikingTone } from '../core/types';

/**
 * viking-progress — determinate/indeterminate progress bar
 *.
 */
@Component({
  selector: 'viking-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (label()) {
      <div class="viking-progress-header">
        <span class="viking-progress-label">{{ label() }}</span>
        @if (!indeterminate()) {
          <span class="viking-progress-value">{{ clamped() }}%</span>
        }
      </div>
    }
    <div
      class="viking-progress-track"
      role="progressbar"
      [attr.aria-label]="label() || 'Progress'"
      [attr.aria-valuemin]="0"
      [attr.aria-valuemax]="100"
      [attr.aria-valuenow]="indeterminate() ? null : clamped()"
    >
      <div
        class="viking-progress-bar"
        [class.viking-indeterminate]="indeterminate()"
        [class]="'viking-bar-' + tone()"
        [style.width.%]="indeterminate() ? 40 : clamped()"
      ></div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        font-family: var(--viking-font-family);
      }
      .viking-progress-header {
        display: flex;
        justify-content: space-between;
        gap: var(--viking-space-2);
        margin-bottom: calc(var(--viking-space-1) / 2);
        font-size: var(--viking-font-size);
      }
      .viking-progress-label {
        color: var(--viking-text);
        font-weight: 500;
      }
      .viking-progress-value {
        color: var(--viking-text-muted);
        font-variant-numeric: tabular-nums;
      }
      .viking-progress-track {
        position: relative;
        height: var(--viking-space-1);
        border-radius: var(--viking-radius-pill);
        background: var(--viking-surface-alt);
        border: 1px solid var(--viking-border);
        overflow: hidden;
      }
      .viking-progress-bar {
        height: 100%;
        border-radius: var(--viking-radius-pill);
        background: var(--viking-accent);
        transition: width 0.3s ease;
      }
      .viking-bar-secondary {
        background: var(--viking-accent-secondary);
      }
      .viking-bar-success {
        background: var(--viking-success);
      }
      .viking-bar-info {
        background: var(--viking-info);
      }
      .viking-bar-warning {
        background: var(--viking-warning);
      }
      .viking-bar-danger {
        background: var(--viking-danger);
      }
      .viking-bar-muted {
        background: var(--viking-text-muted);
      }
      .viking-indeterminate {
        position: absolute;
        animation: viking-progress-slide 1.2s ease-in-out infinite;
      }
      @keyframes viking-progress-slide {
        from {
          left: -40%;
        }
        to {
          left: 100%;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .viking-indeterminate {
          animation-duration: 2.4s;
        }
      }
    `,
  ],
})
export class VikingProgress {
  readonly value = input<number>(0);
  readonly label = input<string>('');
  readonly tone = input<VikingTone>('accent');
  readonly indeterminate = input<boolean>(false);

  protected readonly clamped = computed(() => Math.min(100, Math.max(0, Math.round(this.value()))));
}
