import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FluxTone } from '../core/types';

/**
 * flux-progress — determinate/indeterminate progress bar
 * (https://fluxui.dev/components/progress).
 */
@Component({
  selector: 'flux-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (label()) {
      <div class="flux-progress-header">
        <span class="flux-progress-label">{{ label() }}</span>
        @if (!indeterminate()) {
          <span class="flux-progress-value">{{ clamped() }}%</span>
        }
      </div>
    }
    <div
      class="flux-progress-track"
      role="progressbar"
      [attr.aria-label]="label() || 'Progress'"
      [attr.aria-valuemin]="0"
      [attr.aria-valuemax]="100"
      [attr.aria-valuenow]="indeterminate() ? null : clamped()"
    >
      <div
        class="flux-progress-bar"
        [class.flux-indeterminate]="indeterminate()"
        [class]="'flux-bar-' + tone()"
        [style.width.%]="indeterminate() ? 40 : clamped()"
      ></div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        font-family: var(--flux-font-family);
      }
      .flux-progress-header {
        display: flex;
        justify-content: space-between;
        gap: var(--flux-space-2);
        margin-bottom: calc(var(--flux-space-1) / 2);
        font-size: var(--flux-font-size);
      }
      .flux-progress-label {
        color: var(--flux-text);
        font-weight: 500;
      }
      .flux-progress-value {
        color: var(--flux-text-muted);
        font-variant-numeric: tabular-nums;
      }
      .flux-progress-track {
        position: relative;
        height: var(--flux-space-1);
        border-radius: var(--flux-radius-pill);
        background: var(--flux-surface-alt);
        border: 1px solid var(--flux-border);
        overflow: hidden;
      }
      .flux-progress-bar {
        height: 100%;
        border-radius: var(--flux-radius-pill);
        background: var(--flux-accent);
        transition: width 0.3s ease;
      }
      .flux-bar-success {
        background: var(--flux-success);
      }
      .flux-bar-warning {
        background: var(--flux-warning);
      }
      .flux-bar-danger {
        background: var(--flux-danger);
      }
      .flux-bar-muted {
        background: var(--flux-text-muted);
      }
      .flux-indeterminate {
        position: absolute;
        animation: flux-progress-slide 1.2s ease-in-out infinite;
      }
      @keyframes flux-progress-slide {
        from {
          left: -40%;
        }
        to {
          left: 100%;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .flux-indeterminate {
          animation-duration: 2.4s;
        }
      }
    `,
  ],
})
export class FluxProgress {
  readonly value = input<number>(0);
  readonly label = input<string>('');
  readonly tone = input<FluxTone>('accent');
  readonly indeterminate = input<boolean>(false);

  protected readonly clamped = computed(() => Math.min(100, Math.max(0, Math.round(this.value()))));
}
