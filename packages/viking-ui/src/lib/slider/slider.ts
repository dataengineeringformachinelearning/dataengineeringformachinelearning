import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
} from "@angular/core";
import { VikingControl, provideVikingCva } from "../core/cva";

/**
 * viking-slider — range slider.
 * ControlValueAccessor-compatible.
 */
@Component({
  selector: "viking-slider",
  providers: [provideVikingCva(VikingSlider)],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="viking-slider-header">
      @if (label()) {
        <span class="viking-slider-label">{{ label() }}</span>
      }
      @if (showValue()) {
        <output class="viking-slider-value">{{ value() }}</output>
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
      [style.--viking-slider-fill.%]="fillPercent()"
      (input)="onInput($event)"
      (blur)="onTouched()"
    />
  `,
  styles: [
    `
      :host {
        display: block;
        font-family: var(--viking-font-family);
      }
      .viking-slider-header {
        display: flex;
        justify-content: space-between;
        gap: var(--viking-space-2);
        margin-bottom: calc(var(--viking-space-1) / 2);
        font-size: var(--viking-font-size);
      }
      .viking-slider-label {
        color: var(--viking-text);
        font-weight: 500;
      }
      .viking-slider-value {
        color: var(--viking-text-muted);
        font-variant-numeric: tabular-nums;
      }
      input[type="range"] {
        appearance: none;
        width: 100%;
        height: var(--viking-space-1);
        border-radius: var(--viking-radius-pill);
        border: 1px solid var(--viking-border);
        background: linear-gradient(
          to right,
          var(--viking-accent) var(--viking-slider-fill, 0%),
          var(--viking-surface-alt) var(--viking-slider-fill, 0%)
        );
        cursor: pointer;
        margin: var(--viking-space-1) 0;
      }
      input[type="range"]:disabled {
        opacity: var(--viking-state-disabled-opacity);
        cursor: not-allowed;
      }
      input[type="range"]::-webkit-slider-thumb {
        appearance: none;
        width: var(--viking-space-2);
        height: var(--viking-space-2);
        border-radius: var(--viking-radius-pill);
        background: var(--viking-surface);
        border: 2px solid var(--viking-accent);
        box-shadow: var(--viking-shadow-sm);
        transition: transform 0.15s ease;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.15);
      }
      input[type="range"]::-moz-range-thumb {
        width: var(--viking-space-2);
        height: var(--viking-space-2);
        border-radius: var(--viking-radius-pill);
        background: var(--viking-surface);
        border: 2px solid var(--viking-accent);
        box-shadow: var(--viking-shadow-sm);
      }
      input[type="range"]:focus-visible {
        outline: var(--viking-ring-width) solid var(--viking-ring);
        outline-offset: var(--viking-ring-offset);
      }
    `,
  ],
})
export class VikingSlider extends VikingControl<number> {
  readonly value = model<number>(0);
  readonly min = input<number>(0);
  readonly max = input<number>(100);
  readonly step = input<number>(1);
  readonly label = input<string>("");
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
