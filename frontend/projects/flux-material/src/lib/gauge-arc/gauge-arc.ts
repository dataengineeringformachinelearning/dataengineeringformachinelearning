import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** flux-gauge-arc — semicircle gauge fill driven by value / max. */
@Component({
  selector: 'flux-gauge-arc',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flux-gauge-arc',
    'aria-hidden': 'true',
    '[class.flux-gauge-arc-amber]': "tone() === 'amber'",
    '[class.flux-gauge-arc-danger]': "tone() === 'danger'",
    '[class.flux-gauge-arc-primary]': "tone() === 'primary'",
  },
  template: `
    <svg class="flux-gauge-arc-svg" viewBox="0 0 100 60">
      <path class="flux-gauge-arc-bg" d="M 10 50 A 40 40 0 0 1 90 50" />
      <path
        class="flux-gauge-arc-fill"
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
      .flux-gauge-arc-svg {
        width: 100%;
        height: auto;
        overflow: visible;
      }
      .flux-gauge-arc-bg,
      .flux-gauge-arc-fill {
        fill: none;
        stroke-width: 8;
        stroke-linecap: round;
      }
      .flux-gauge-arc-bg {
        stroke: color-mix(in srgb, var(--flux-text-muted) 25%, transparent);
      }
      .flux-gauge-arc-fill {
        stroke: var(--flux-accent);
        transition: stroke-dasharray 0.4s ease;
      }
      :host(.flux-gauge-arc-amber) .flux-gauge-arc-fill {
        stroke: var(--flux-warning);
      }
      :host(.flux-gauge-arc-danger) .flux-gauge-arc-fill {
        stroke: var(--flux-danger);
      }
      :host(.flux-gauge-arc-primary) .flux-gauge-arc-fill {
        stroke: var(--flux-accent);
      }
    `,
  ],
})
export class FluxGaugeArc {
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
