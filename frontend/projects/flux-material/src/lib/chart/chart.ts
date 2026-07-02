import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FluxChartKind, FluxChartSeries, FluxDonutSegment, FluxTone } from '../core/types';

interface ChartPath {
  name: string;
  tone: FluxTone;
  line: string;
  area: string;
}

interface BarRect {
  x: number;
  y: number;
  width: number;
  height: number;
  tone: FluxTone;
}

interface DonutSlice {
  label: string;
  tone: FluxTone;
  path: string;
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
 * flux-chart — zero-dependency native SVG charts (line, bar, donut).
 */
@Component({
  selector: 'flux-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="flux-chart">
      <svg
        [attr.viewBox]="'0 0 ' + width + ' ' + height"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        [attr.aria-label]="label() || 'Chart'"
      >
        @if (kind() === 'donut') {
          @for (slice of donutSlices(); track slice.label) {
            <path class="flux-chart-donut-slice" [attr.d]="slice.path" [style.fill]="toneVar(slice.tone)" />
          }
          <circle class="flux-chart-donut-hole" [attr.cx]="width / 2" [attr.cy]="height / 2" r="52" />
        } @else {
          @for (line of gridLines; track line) {
            <line
              class="flux-chart-grid"
              [attr.x1]="pad"
              [attr.x2]="width - pad"
              [attr.y1]="line"
              [attr.y2]="line"
            ></line>
          }
          @if (kind() === 'bar') {
            @for (bar of barRects(); track bar.x) {
              <rect
                class="flux-chart-bar"
                [attr.x]="bar.x"
                [attr.y]="bar.y"
                [attr.width]="bar.width"
                [attr.height]="bar.height"
                [style.fill]="toneVar(bar.tone)"
                rx="4"
              />
            }
          } @else {
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
          }
        }
      </svg>
      @if (kind() === 'donut' && donutSlices().length > 0) {
        <figcaption class="flux-chart-legend">
          @for (item of segments(); track item.label) {
            <span class="flux-chart-legend-item">
              <span
                class="flux-chart-swatch"
                [style.background]="toneVar(item.tone ?? 'accent')"
              ></span>
              {{ item.label }}
            </span>
          }
        </figcaption>
      } @else if (series().length > 1) {
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
        min-height: 180px;
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
      .flux-chart-bar {
        opacity: 0.92;
      }
      .flux-chart-donut-slice {
        stroke: var(--flux-surface);
        stroke-width: 2;
      }
      .flux-chart-donut-hole {
        fill: var(--flux-surface);
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
  readonly kind = input<FluxChartKind>('line');
  readonly series = input<FluxChartSeries[]>([{ name: 'Series', data: [] }]);
  readonly categories = input<string[]>([]);
  readonly segments = input<FluxDonutSegment[]>([]);
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

  protected readonly barRects = computed<BarRect[]>(() => {
    const primary = this.series()[0];
    if (!primary?.data.length) {
      return [];
    }
    const max = Math.max(...primary.data, 1);
    const plotWidth = WIDTH - PAD * 2;
    const barGap = 6;
    const barWidth = Math.max(8, plotWidth / primary.data.length - barGap);
    return primary.data.map((value, index) => {
      const height = ((value / max) * (HEIGHT - PAD * 2)) || 0;
      const x = PAD + index * (barWidth + barGap);
      const y = HEIGHT - PAD - height;
      return {
        x,
        y,
        width: barWidth,
        height,
        tone: primary.tone ?? 'accent',
      };
    });
  });

  protected readonly donutSlices = computed<DonutSlice[]>(() => {
    const items = this.segments().filter(item => item.value > 0);
    const total = items.reduce((sum, item) => sum + item.value, 0);
    if (total <= 0) {
      return [];
    }
    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;
    const outer = Math.min(WIDTH, HEIGHT) / 2 - PAD;
    const inner = outer * 0.58;
    let cursor = -Math.PI / 2;
    return items.map(item => {
      const angle = (item.value / total) * Math.PI * 2;
      const start = cursor;
      const end = cursor + angle;
      cursor = end;
      const x1 = cx + outer * Math.cos(start);
      const y1 = cy + outer * Math.sin(start);
      const x2 = cx + outer * Math.cos(end);
      const y2 = cy + outer * Math.sin(end);
      const x3 = cx + inner * Math.cos(end);
      const y3 = cy + inner * Math.sin(end);
      const x4 = cx + inner * Math.cos(start);
      const y4 = cy + inner * Math.sin(start);
      const large = angle > Math.PI ? 1 : 0;
      const path = `M ${x1} ${y1} A ${outer} ${outer} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${inner} ${inner} 0 ${large} 0 ${x4} ${y4} Z`;
      return { label: item.label, tone: item.tone ?? 'accent', path };
    });
  });
}
