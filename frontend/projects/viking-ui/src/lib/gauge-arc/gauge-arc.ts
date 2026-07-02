import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** viking-gauge-arc — semicircle gauge fill driven by value / max. */
@Component({
  selector: 'viking-gauge-arc',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'viking-gauge-arc',
    'aria-hidden': 'true',
    '[class.viking-gauge-arc-amber]': "tone() === 'amber'",
    '[class.viking-gauge-arc-danger]': "tone() === 'danger'",
    '[class.viking-gauge-arc-primary]': "tone() === 'primary'",
  },
  template: `
    <svg class="viking-gauge-arc-svg" viewBox="0 0 100 60">
      <path class="viking-gauge-arc-bg" d="M 10 50 A 40 40 0 0 1 90 50" />
      <path
        class="viking-gauge-arc-fill"
        d="M 10 50 A 40 40 0 0 1 90 50"
        [attr.stroke-dasharray]="strokeDasharray()"
      />
    </svg>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      .viking-gauge-arc-svg {
        width: 100%;
        height: auto;
        overflow: visible;
      }
      .viking-gauge-arc-bg,
      .viking-gauge-arc-fill {
        fill: none;
        stroke-width: 8;
        stroke-linecap: round;
      }
      .viking-gauge-arc-bg {
        stroke: color-mix(in srgb, var(--viking-text-muted) 25%, transparent);
      }
      .viking-gauge-arc-fill {
        stroke: var(--viking-accent);
        transition: stroke-dasharray 0.4s ease;
      }
      :host(.viking-gauge-arc-amber) .viking-gauge-arc-fill {
        stroke: var(--viking-warning);
      }
      :host(.viking-gauge-arc-danger) .viking-gauge-arc-fill {
        stroke: var(--viking-danger);
      }
      :host(.viking-gauge-arc-primary) .viking-gauge-arc-fill {
        stroke: var(--viking-accent);
      }
    `,
  ],
})
export class VikingGaugeArc {
  readonly value = input.required<number>();
  readonly max = input<number>(100);
  readonly circumference = input<number>(125.66);
  readonly tone = input<'accent' | 'amber' | 'danger' | 'primary'>('accent');

  protected readonly strokeDasharray = computed(() => {
    const pct = Math.max(0, Math.min(1, this.value() / this.max()));
    const filled = pct * this.circumference();
    return `${filled} ${this.circumference()}`;
  });
}
