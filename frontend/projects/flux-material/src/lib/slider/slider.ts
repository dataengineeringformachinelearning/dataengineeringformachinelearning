import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { FluxControl, provideFluxCva } from '../core/cva';

/**
 * flux-slider — range slider (https://fluxui.dev/components/slider).
 * ControlValueAccessor-compatible.
 */
@Component({
  selector: 'flux-slider',
  providers: [provideFluxCva(FluxSlider)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flux-slider-header">
      @if (label()) {
        <span class="flux-slider-label">{{ label() }}</span>
      }
      @if (showValue()) {
        <output class="flux-slider-value">{{ value() }}</output>
      }
    </div>
    <input
      type="range"
      [min]="min()"
      [max]="max()"
      [step]="step()"
      [value]="value()"
      [disabled]="disabled() || formDisabled()"
      [attr.aria-label]="label() || 'Slider'"
      [style.--flux-slider-fill.%]="fillPercent()"
      (input)="onInput($event)"
      (blur)="onTouched()"
    />
  `,
  styles: [
    `
      :host {
        display: block;
        font-family: var(--flux-font-family);
      }
      .flux-slider-header {
        display: flex;
        justify-content: space-between;
        gap: var(--flux-space-2);
        margin-bottom: calc(var(--flux-space-1) / 2);
        font-size: var(--flux-font-size);
      }
      .flux-slider-label {
        color: var(--flux-text);
        font-weight: 500;
      }
      .flux-slider-value {
        color: var(--flux-text-muted);
        font-variant-numeric: tabular-nums;
      }
      input[type='range'] {
        appearance: none;
        width: 100%;
        height: var(--flux-space-1);
        border-radius: var(--flux-radius-pill);
        border: 1px solid var(--flux-border);
        background: linear-gradient(
          to right,
          var(--flux-accent) var(--flux-slider-fill, 0%),
          var(--flux-surface-alt) var(--flux-slider-fill, 0%)
        );
        cursor: pointer;
        margin: var(--flux-space-1) 0;
      }
      input[type='range']:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      input[type='range']::-webkit-slider-thumb {
        appearance: none;
        width: var(--flux-space-2);
        height: var(--flux-space-2);
        border-radius: var(--flux-radius-pill);
        background: var(--flux-surface);
        border: 2px solid var(--flux-accent);
        box-shadow: var(--flux-shadow-sm);
        transition: transform 0.15s ease;
      }
      input[type='range']::-webkit-slider-thumb:hover {
        transform: scale(1.15);
      }
      input[type='range']::-moz-range-thumb {
        width: var(--flux-space-2);
        height: var(--flux-space-2);
        border-radius: var(--flux-radius-pill);
        background: var(--flux-surface);
        border: 2px solid var(--flux-accent);
        box-shadow: var(--flux-shadow-sm);
      }
      input[type='range']:focus-visible {
        outline: var(--flux-ring-width) solid var(--flux-ring);
        outline-offset: var(--flux-ring-offset);
      }
    `,
  ],
})
export class FluxSlider extends FluxControl<number> {
  readonly value = model<number>(0);
  readonly min = input<number>(0);
  readonly max = input<number>(100);
  readonly step = input<number>(1);
  readonly label = input<string>('');
  readonly showValue = input<boolean>(true);
  readonly disabled = input<boolean>(false);

  protected readonly fillPercent = computed(() => {
    const range = this.max() - this.min();
    if (range <= 0) {
      return 0;
    }
    return ((this.value() - this.min()) / range) * 100;
  });

  writeValue(value: number): void {
    this.value.set(Number(value ?? 0));
  }

  protected onInput = (event: Event): void => {
    const next = Number((event.target as HTMLInputElement).value);
    this.value.set(next);
    this.onChange(next);
  };
}
