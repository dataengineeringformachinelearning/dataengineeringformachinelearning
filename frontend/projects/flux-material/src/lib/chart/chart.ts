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

interface AxisLabel {
  x: number;
  y: number;
  text: string;
  anchor: 'start' | 'middle' | 'end';
}

const TONE_VARS: Record<FluxTone, string> = {
  accent: 'var(--flux-accent)',
  success: 'var(--flux-success)',
  warning: 'var(--flux-warning)',
  danger: 'var(--flux-danger)',
  muted: 'var(--flux-text-muted)',
};

const WIDTH = 720;
const HEIGHT_DEFAULT = 260;
const HEIGHT_COMPACT = 200;
const PAD_TOP = 14;
const PAD_RIGHT = 16;
const PAD_BOTTOM = 36;
const PAD_LEFT = 48;

const formatTick = (value: number): string => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 10_000) {
    return `${Math.round(value / 1000)}K`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  if (Number.isInteger(value)) {
    return `${value}`;
  }
  return value.toFixed(value < 10 ? 1 : 0);
};

const truncateLabel = (label: string, max = 10): string =>
  label.length > max ? `${label.slice(0, max - 1)}…` : label;

/**
 * flux-chart — zero-dependency native SVG charts (line, bar, donut).
 */
@Component({
  selector: 'flux-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.flux-chart-fill-host]': 'fill()',
  },
  template: `
    <figure class="flux-chart" [class.flux-chart-fill]="fill()" [class.flux-chart-compact]="compact() && !fill()">
      <svg
        [attr.viewBox]="'0 0 ' + width + ' ' + height()"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        [attr.aria-label]="label() || 'Chart'"
      >
        @if (kind() === 'donut') {
          @for (slice of donutSlices(); track slice.label) {
            <path class="flux-chart-donut-slice" [attr.d]="slice.path" [style.fill]="toneVar(slice.tone)" />
          }
          @if (donutSlices().length > 0) {
            <circle class="flux-chart-donut-hole" [attr.cx]="width / 2" [attr.cy]="plotCy()" r="46" />
            <text
              class="flux-chart-donut-total"
              [attr.x]="width / 2"
              [attr.y]="plotCy()"
              text-anchor="middle"
              dominant-baseline="central"
            >
              {{ donutTotalLabel() }}
            </text>
          }
        } @else {
          @for (line of gridLines(); track line) {
            <line
              class="flux-chart-grid"
              [attr.x1]="padLeft"
              [attr.x2]="width - padRight"
              [attr.y1]="line"
              [attr.y2]="line"
            ></line>
          }
          @for (tick of yAxisLabels(); track tick.text + tick.y) {
            <text
              class="flux-chart-axis-y"
              [attr.x]="padLeft - 8"
              [attr.y]="tick.y"
              [attr.text-anchor]="tick.anchor"
              dominant-baseline="middle"
            >
              {{ tick.text }}
            </text>
          }
          @for (tick of xAxisLabels(); track tick.text + tick.x) {
            <text
              class="flux-chart-axis-x"
              [attr.x]="tick.x"
              [attr.y]="height() - 8"
              [attr.text-anchor]="tick.anchor"
            >
              {{ tick.text }}
            </text>
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
                rx="3"
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
            @if (item.value > 0) {
              <span class="flux-chart-legend-item">
                <span
                  class="flux-chart-swatch"
                  [style.background]="toneVar(item.tone ?? 'accent')"
                ></span>
                {{ item.label }}
              </span>
            }
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
      :host {
        display: block;
        width: 100%;
      }
      :host(.flux-chart-fill-host) {
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: 240px;
        height: 100%;
      }
      .flux-chart {
        margin: 0;
        font-family: var(--flux-font-family);
        overflow: hidden;
        width: 100%;
        max-width: 100%;
      }
      .flux-chart-fill {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        min-height: 240px;
        height: 100%;
      }
      svg {
        display: block;
        width: 100%;
        height: auto;
        min-height: 180px;
        background: var(--flux-surface);
        border: 1px solid var(--flux-border);
        border-radius: var(--flux-radius);
        overflow: hidden;
      }
      .flux-chart-fill svg {
        flex: 1 1 auto;
        height: 100%;
        min-height: 240px;
        max-height: none;
      }
      .flux-chart-compact svg {
        max-height: 220px;
      }
      .flux-chart-grid {
        stroke: var(--flux-border);
        stroke-width: 1;
        opacity: 0.65;
      }
      .flux-chart-axis-y,
      .flux-chart-axis-x {
        fill: var(--flux-text-muted);
        font-size: 11px;
        font-family: var(--flux-font-family);
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
      .flux-chart-donut-total {
        fill: var(--flux-text);
        font-size: 14px;
        font-weight: 700;
        font-family: var(--flux-font-family);
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
        line-height: 1.2;
      }
      .flux-chart-swatch {
        width: 12px;
        height: 12px;
        border-radius: 3px;
        display: inline-block;
        flex-shrink: 0;
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
  readonly compact = input<boolean>(false);
  readonly fill = input<boolean>(false);

  protected readonly width = WIDTH;
  protected readonly padLeft = PAD_LEFT;
  protected readonly padRight = PAD_RIGHT;

  protected readonly height = computed(() =>
    this.compact() ? HEIGHT_COMPACT : HEIGHT_DEFAULT,
  );

  protected readonly plotBottom = computed(() => this.height() - PAD_BOTTOM);
  protected readonly plotTop = computed(() => PAD_TOP);

  protected readonly plotCy = computed(() => this.height() / 2);

  protected toneVar = (tone: FluxTone): string => TONE_VARS[tone];

  protected readonly valueRange = computed(() => {
    const all = this.series().flatMap(item => item.data);
    if (all.length === 0) {
      return { min: 0, max: 1 };
    }
    const min = Math.min(...all);
    const max = Math.max(...all);
    return { min, max: max === min ? max + 1 : max };
  });

  protected readonly gridLines = computed(() => {
    const bottom = this.plotBottom();
    const top = this.plotTop();
    const mid = top + (bottom - top) / 2;
    return [top, mid, bottom];
  });

  protected readonly yAxisLabels = computed<AxisLabel[]>(() => {
    const { min, max } = this.valueRange();
    const bottom = this.plotBottom();
    const top = this.plotTop();
    const mid = top + (bottom - top) / 2;
    return [
      { x: 0, y: top, text: formatTick(max), anchor: 'end' },
      { x: 0, y: mid, text: formatTick(min + (max - min) / 2), anchor: 'end' },
      { x: 0, y: bottom, text: formatTick(min), anchor: 'end' },
    ];
  });

  protected readonly xAxisLabels = computed<AxisLabel[]>(() => {
    if (this.kind() === 'donut') {
      return [];
    }
    const primary = this.series()[0];
    const count = primary?.data.length ?? 0;
    if (count === 0) {
      return [];
    }
    const cats = this.categories();
    const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
    const bottom = this.height();
    const maxLabels = 6;
    const step = Math.max(1, Math.ceil(count / maxLabels));
    const labels: AxisLabel[] = [];

    for (let index = 0; index < count; index += step) {
      const x =
        PAD_LEFT +
        (count === 1 ? plotWidth / 2 : (index / Math.max(1, count - 1)) * plotWidth);
      const text = cats[index] ? truncateLabel(cats[index]) : `${index + 1}`;
      labels.push({ x, y: bottom, text, anchor: 'middle' });
    }

    if ((count - 1) % step !== 0 && count > 1) {
      const last = count - 1;
      const x = PAD_LEFT + (last / Math.max(1, count - 1)) * plotWidth;
      const text = cats[last] ? truncateLabel(cats[last]) : `${last + 1}`;
      if (!labels.some(item => item.text === text)) {
        labels.push({ x, y: bottom, text, anchor: 'middle' });
      }
    }

    return labels;
  });

  protected readonly paths = computed<ChartPath[]>(() => {
    const all = this.series().flatMap(item => item.data);
    if (all.length === 0) {
      return [];
    }
    const { min, max } = this.valueRange();
    const range = max - min || 1;
    const bottom = this.plotBottom();
    const top = this.plotTop();
    const plotHeight = bottom - top;

    return this.series().map(item => {
      const points = item.data.map((value, index) => {
        const x =
          PAD_LEFT +
          (index / Math.max(1, item.data.length - 1)) * (WIDTH - PAD_LEFT - PAD_RIGHT);
        const y = bottom - ((value - min) / range) * plotHeight;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });
      const line = `M${points.join(' L')}`;
      const area = `${line} L${WIDTH - PAD_RIGHT},${bottom} L${PAD_LEFT},${bottom} Z`;
      return { name: item.name, tone: item.tone ?? 'accent', line, area };
    });
  });

  protected readonly barRects = computed<BarRect[]>(() => {
    const primary = this.series()[0];
    if (!primary?.data.length) {
      return [];
    }
    const { min, max } = this.valueRange();
    const range = max - min || 1;
    const bottom = this.plotBottom();
    const top = this.plotTop();
    const plotHeight = bottom - top;
    const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
    const barGap = 4;
    const barWidth = Math.max(6, plotWidth / primary.data.length - barGap);

    return primary.data.map((value, index) => {
      const normalized = (value - min) / range;
      const height = Math.max(0, normalized * plotHeight);
      const x = PAD_LEFT + index * (barWidth + barGap);
      const y = bottom - height;
      return {
        x,
        y,
        width: barWidth,
        height,
        tone: primary.tone ?? 'accent',
      };
    });
  });

  protected readonly donutTotalLabel = computed(() => {
    const total = this.segments()
      .filter(item => item.value > 0)
      .reduce((sum, item) => sum + item.value, 0);
    return formatTick(total);
  });

  protected readonly donutSlices = computed<DonutSlice[]>(() => {
    const items = this.segments().filter(item => item.value > 0);
    const total = items.reduce((sum, item) => sum + item.value, 0);
    if (total <= 0) {
      return [];
    }
    const cx = WIDTH / 2;
    const cy = this.plotCy();
    const outer = Math.min(WIDTH, this.height()) / 2 - PAD_TOP - 4;
    const inner = outer * 0.55;
    let cursor = -Math.PI / 2;

    return items.map(item => {
      const angle = (item.value / total) * Math.PI * 2;
      const start = cursor;
      const end = cursor + angle;
      cursor = end;

      if (items.length === 1) {
        const path = [
          `M ${cx - outer} ${cy}`,
          `A ${outer} ${outer} 0 1 1 ${cx + outer} ${cy}`,
          `A ${outer} ${outer} 0 1 1 ${cx - outer} ${cy}`,
          `M ${cx - inner} ${cy}`,
          `A ${inner} ${inner} 0 1 0 ${cx + inner} ${cy}`,
          `A ${inner} ${inner} 0 1 0 ${cx - inner} ${cy}`,
          'Z',
        ].join(' ');
        return { label: item.label, tone: item.tone ?? 'accent', path };
      }

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
