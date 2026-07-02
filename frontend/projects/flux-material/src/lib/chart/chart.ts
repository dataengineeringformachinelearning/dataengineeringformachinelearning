import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FluxChartSeries, FluxTone } from '../core/types';

interface ChartPath {
  name: string;
  tone: FluxTone;
  line: string;
  area: string;
}

const TONE_VARS: Record<FluxTone, string> = {
  accent: 'var(--flux-accent)',
  success: 'var(--flux-success)',
  warning: 'var(--flux-warning)',
  danger: 'var(--flux-danger)',
  muted: 'var(--flux-text-muted)',
};

const WIDTH = 720;
const HEIGHT = 240;
const PAD = 18;

/**
 * flux-chart — zero-dependency native SVG line/area chart
 * (https://fluxui.dev/components/chart). High-frequency data without bloat,
 * per the DEML native-SVG telemetry principle.
 */
@Component({
  selector: 'flux-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="flux-chart">
      <svg
        [attr.viewBox]="'0 0 ' + width + ' ' + height"
        preserveAspectRatio="none"
        role="img"
        [attr.aria-label]="label() || 'Chart'"
      >
        @for (line of gridLines; track line) {
          <line
            class="flux-chart-grid"
            [attr.x1]="pad"
            [attr.x2]="width - pad"
            [attr.y1]="line"
            [attr.y2]="line"
          ></line>
        }
        @for (path of paths(); track path.name) {
          @if (showArea()) {
            <path
              class="flux-chart-area"
              [attr.d]="path.area"
              [style.fill]="toneVar(path.tone)"
            ></path>
          }
          <path
            class="flux-chart-line"
            [attr.d]="path.line"
            [style.stroke]="toneVar(path.tone)"
          ></path>
        }
      </svg>
      @if (series().length > 1) {
        <figcaption class="flux-chart-legend">
          @for (item of series(); track item.name) {
            <span class="flux-chart-legend-item">
              <span
                class="flux-chart-swatch"
                [style.background]="toneVar(item.tone ?? 'accent')"
              ></span>
              {{ item.name }}
            </span>
          }
        </figcaption>
      }
    </figure>
  `,
  styles: [
    `
      .flux-chart {
        margin: 0;
        font-family: var(--flux-font-family);
      }
      svg {
        display: block;
        width: 100%;
        height: auto;
        background: var(--flux-surface);
        border: 1px solid var(--flux-border);
        border-radius: var(--flux-radius);
      }
      .flux-chart-grid {
        stroke: var(--flux-border);
        stroke-width: 1;
      }
      .flux-chart-line {
        fill: none;
        stroke-width: 2.5;
        stroke-linecap: round;
        stroke-linejoin: round;
        vector-effect: non-scaling-stroke;
      }
      .flux-chart-area {
        opacity: 0.12;
        stroke: none;
      }
      .flux-chart-legend {
        display: flex;
        flex-wrap: wrap;
        gap: var(--flux-space-2);
        margin-top: var(--flux-space-1);
        font-size: var(--flux-font-size);
        color: var(--flux-text-muted);
      }
      .flux-chart-legend-item {
        display: inline-flex;
        align-items: center;
        gap: calc(var(--flux-space-1) / 1.5);
      }
      .flux-chart-swatch {
        width: 12px;
        height: 12px;
        border-radius: 3px;
        display: inline-block;
      }
    `,
  ],
})
export class FluxChart {
  readonly series = input.required<FluxChartSeries[]>();
  readonly label = input<string>('');
  readonly showArea = input<boolean>(true);

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly pad = PAD;
  protected readonly gridLines = [PAD, HEIGHT / 2, HEIGHT - PAD];

  protected toneVar = (tone: FluxTone): string => TONE_VARS[tone];

  protected readonly paths = computed<ChartPath[]>(() => {
    const all = this.series().flatMap(item => item.data);
    if (all.length === 0) {
      return [];
    }
    const min = Math.min(...all);
    const max = Math.max(...all);
    const range = max - min || 1;
    return this.series().map(item => {
      const points = item.data.map((value, index) => {
        const x = PAD + (index / Math.max(1, item.data.length - 1)) * (WIDTH - PAD * 2);
        const y = HEIGHT - PAD - ((value - min) / range) * (HEIGHT - PAD * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });
      const line = `M${points.join(' L')}`;
      const area = `${line} L${WIDTH - PAD},${HEIGHT - PAD} L${PAD},${HEIGHT - PAD} Z`;
      return { name: item.name, tone: item.tone ?? 'accent', line, area };
    });
  });
}
