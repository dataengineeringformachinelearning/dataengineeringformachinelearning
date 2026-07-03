import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** viking-ring-gauge — circular progress ring for health/score displays. */
@Component({
  selector: 'viking-ring-gauge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'viking-ring-gauge',
    'aria-hidden': 'true',
    '[attr.data-status]': 'status()',
  },
  template: `
    <svg class="viking-ring-gauge-svg" viewBox="0 0 120 120" fill="none">
      <circle class="viking-ring-bg" cx="60" cy="60" r="52" />
      <circle
        class="viking-ring-fill"
        cx="60"
        cy="60"
        r="52"
        stroke-linecap="round"
        [attr.stroke-dasharray]="strokeDasharray()"
      />
    </svg>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        color: var(--viking-accent);
      }

      .viking-ring-gauge-svg {
        width: 100%;
        height: 100%;
        shape-rendering: geometricPrecision;
      }

      .viking-ring-bg,
      .viking-ring-fill {
        fill: none;
        stroke-width: 10;
        transform: rotate(-90deg);
        transform-origin: 50% 50%;
      }

      .viking-ring-bg {
        stroke: color-mix(in srgb, var(--viking-text-muted) 20%, transparent);
      }

      .viking-ring-fill {
        stroke: currentColor;
        transition: stroke-dasharray 0.4s var(--viking-ease-default);
      }
    `,
  ],
})
export class VikingRingGauge {
  readonly value = input.required<number>();
  readonly max = input<number>(100);
  readonly circumference = input<number>(327);
  readonly status = input<string>('');

  protected readonly strokeDasharray = computed(() => {
    const pct = Math.max(0, Math.min(1, this.value() / this.max()));
    const filled = pct * this.circumference();
    return `${filled} ${this.circumference()}`;
  });
}
