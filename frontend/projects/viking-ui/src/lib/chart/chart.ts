import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  VikingChartCurve,
  VikingChartKind,
  VikingChartSeries,
  VikingDonutSegment,
  VikingTone,
} from '../core/types';

interface ChartPath {
  name: string;
  tone: VikingTone;
  line: string;
  area: string;
}

interface ChartPoint {
  x: number;
  y: number;
  tone: VikingTone;
}

interface BarRect {
  x: number;
  y: number;
  width: number;
  height: number;
  tone: VikingTone;
  radiusTop: boolean;
}

interface DonutSlice {
  label: string;
  tone: VikingTone;
  path: string;
}

interface AxisLabel {
  x: number;
  y: number;
  text: string;
  anchor: 'start' | 'middle' | 'end';
}

interface TickMark {
  x: number;
  y1: number;
  y2: number;
}

interface Gutter {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const TONE_VARS: Record<VikingTone, string> = {
  accent: 'var(--viking-accent)',
  secondary: 'var(--viking-accent-secondary)',
  success: 'var(--viking-success)',
  warning: 'var(--viking-warning)',
  danger: 'var(--viking-danger)',
  info: 'var(--viking-info)',
  muted: 'var(--viking-text-muted)',
};

const WIDTH = 720;
const HEIGHT_DEFAULT = 240;
const HEIGHT_COMPACT = 200;
const HEIGHT_SPARKLINE = 48;
const BAR_WIDTH_MIN = 8;
const BAR_WIDTH_MAX = 52;
const SINGLE_BAR_WIDTH = 36;

const resolveBarWidth = (slotWidth: number, count: number, widthPercent: number): number => {
  if (count <= 1) {
    return SINGLE_BAR_WIDTH;
  }
  return Math.min(BAR_WIDTH_MAX, Math.max(BAR_WIDTH_MIN, slotWidth * (widthPercent / 100)));
};

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

const parseGutter = (value: number | string | undefined, sparkline: boolean): Gutter => {
  if (sparkline) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  if (value === undefined || value === null) {
    return { top: 12, right: 20, bottom: 36, left: 48 };
  }
  if (typeof value === 'number') {
    return { top: value, right: value, bottom: value, left: value };
  }
  const parts = value
    .trim()
    .split(/\s+/)
    .map(part => Number(part));
  if (parts.length === 1) {
    return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
  }
  if (parts.length === 2) {
    return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
  }
  if (parts.length === 3) {
    return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
  }
  return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
};

const buildLinearPath = (points: { x: number; y: number }[]): string => {
  if (points.length === 0) {
    return '';
  }
  return `M${points.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' L')}`;
};

const buildSmoothPath = (points: { x: number; y: number }[]): string => {
  if (points.length < 3) {
    return buildLinearPath(points);
  }
  let path = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const previous = points[index - 1] ?? current;
    const after = points[index + 2] ?? next;
    const cp1x = current.x + (next.x - previous.x) / 6;
    const cp1y = current.y + (next.y - previous.y) / 6;
    const cp2x = next.x - (after.x - current.x) / 6;
    const cp2y = next.y - (after.y - current.y) / 6;
    path += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${next.x.toFixed(1)},${next.y.toFixed(1)}`;
  }
  return path;
};

/**
 * viking-chart — zero-dependency native SVG charts styled after Viking UI.
 */
@Component({
  selector: 'viking-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.viking-chart-fill-host]': 'fill()',
    '[class.viking-chart-sparkline-host]': "kind() === 'sparkline'",
  },
  template: `
    <figure
      class="viking-chart"
      [class.viking-chart-fill]="fill()"
      [class.viking-chart-compact]="compact() && !fill()"
      [class.viking-chart-sparkline]="isSparkline()"
      [class.viking-chart-has-legend]="legendVisible()"
      [attr.aria-labelledby]="label() ? 'viking-chart-label-' + chartId : null"
      [attr.aria-describedby]="summary() ? 'viking-chart-summary-' + chartId : null"
    >
      @if (label()) {
        <figcaption class="sr-only" [id]="'viking-chart-label-' + chartId">
          {{ label() }}
        </figcaption>
      }
      @if (summary()) {
        <p class="sr-only" [id]="'viking-chart-summary-' + chartId">{{ summary() }}</p>
      }
      <svg
        [attr.viewBox]="'0 0 ' + width + ' ' + height()"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        [attr.aria-label]="label() || 'Chart'"
        aria-hidden="true"
      >
        @if (kind() === 'donut') {
          @for (slice of donutSlices(); track slice.label) {
            <path
              class="viking-chart-donut-slice"
              [attr.d]="slice.path"
              [style.fill]="toneVar(slice.tone)"
            />
          }
          @if (donutSlices().length > 0) {
            <circle
              class="viking-chart-donut-hole"
              [attr.cx]="width / 2"
              [attr.cy]="plotCy()"
              [attr.r]="donutInnerRadius()"
            />
            <text
              class="viking-chart-donut-total"
              [attr.x]="width / 2"
              [attr.y]="plotCy()"
              text-anchor="middle"
              dominant-baseline="central"
            >
              {{ donutTotalLabel() }}
            </text>
          }
        } @else {
          <defs>
            <clipPath id="viking-plot-clip">
              <rect
                [attr.x]="resolvedGutter().left"
                [attr.y]="plotTop()"
                [attr.width]="width - resolvedGutter().left - resolvedGutter().right"
                [attr.height]="plotBottom() - plotTop()"
              />
            </clipPath>
          </defs>
          @if (!isSparkline()) {
            @for (line of gridLines(); track line) {
              <line
                class="viking-chart-grid"
                [attr.x1]="resolvedGutter().left"
                [attr.x2]="width - resolvedGutter().right"
                [attr.y1]="line"
                [attr.y2]="line"
              ></line>
            }
            <line
              class="viking-chart-axis-line"
              [attr.x1]="resolvedGutter().left"
              [attr.x2]="width - resolvedGutter().right"
              [attr.y1]="plotBottom()"
              [attr.y2]="plotBottom()"
            ></line>
            @for (tick of yAxisLabels(); track tick.text + tick.y) {
              <text
                class="viking-chart-axis-y"
                [attr.x]="resolvedGutter().left - 10"
                [attr.y]="tick.y"
                [attr.text-anchor]="tick.anchor"
                dominant-baseline="middle"
              >
                {{ tick.text }}
              </text>
            }
            @for (tick of xAxisLabels(); track tick.text + tick.x) {
              <text
                class="viking-chart-axis-x"
                [attr.x]="tick.x"
                [attr.y]="height() - 10"
                [attr.text-anchor]="tick.anchor"
              >
                {{ tick.text }}
              </text>
            }
            @for (mark of xTickMarks(); track mark.x) {
              <line
                class="viking-chart-tick"
                [attr.x1]="mark.x"
                [attr.x2]="mark.x"
                [attr.y1]="mark.y1"
                [attr.y2]="mark.y2"
              ></line>
            }
          }
          @if (isBarKind()) {
            @for (bar of barRects(); track bar.x + '-' + bar.y + '-' + bar.tone) {
              <rect
                class="viking-chart-bar"
                [attr.x]="bar.x"
                [attr.y]="bar.y"
                [attr.width]="bar.width"
                [attr.height]="bar.height"
                [style.fill]="toneVar(bar.tone)"
                [attr.rx]="bar.radiusTop ? barRadius() : 0"
                [attr.ry]="bar.radiusTop ? barRadius() : 0"
              />
            }
          } @else {
            <g clip-path="url(#viking-plot-clip)">
              @for (path of paths(); track path.name) {
                @if (renderArea()) {
                  <path
                    class="viking-chart-area"
                    [attr.d]="path.area"
                    [style.fill]="toneVar(path.tone)"
                  ></path>
                }
                <path
                  class="viking-chart-line"
                  [attr.d]="path.line"
                  [style.stroke]="toneVar(path.tone)"
                ></path>
              }
              @if (renderPoints()) {
                @for (point of linePoints(); track point.x + '-' + point.y + '-' + point.tone) {
                  <circle
                    class="viking-chart-point"
                    [attr.cx]="point.x"
                    [attr.cy]="point.y"
                    [attr.r]="pointRadius()"
                    [style.fill]="toneVar(point.tone)"
                  />
                }
              }
            </g>
          }
        }
      </svg>
      @if (legendVisible()) {
        <figcaption class="viking-chart-legend">
          @if (kind() === 'donut') {
            @for (item of segments(); track item.label) {
              @if (item.value > 0) {
                <span class="viking-chart-legend-item">
                  <span
                    class="viking-chart-swatch"
                    [style.background]="toneVar(item.tone ?? 'accent')"
                  ></span>
                  {{ item.label }}
                </span>
              }
            }
          } @else {
            @for (item of series(); track item.name) {
              <span class="viking-chart-legend-item">
                <span
                  class="viking-chart-swatch"
                  [style.background]="toneVar(item.tone ?? 'accent')"
                ></span>
                {{ item.name }}
              </span>
            }
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
      :host(.viking-chart-fill-host) {
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: var(--viking-chart-fill-min-height, clamp(16rem, 32vw, 17.5rem));
        max-height: var(--viking-chart-fill-max-height, clamp(17.5rem, 40vw, 21rem));
        height: 100%;
      }
      :host(.viking-chart-sparkline-host) {
        display: inline-block;
        width: auto;
        max-width: 100%;
      }
      :host(.viking-chart-wide) {
        display: block;
        width: 100%;
      }
      .viking-chart {
        margin: 0;
        font-family: var(--viking-font-family);
        overflow: hidden;
        width: 100%;
        max-width: 100%;
        container-type: inline-size;
      }
      .viking-chart:not(.viking-chart-fill):not(.viking-chart-sparkline) {
        aspect-ratio: var(--viking-chart-ratio, 3 / 1);
        min-height: var(--viking-chart-min-height, clamp(9.5rem, 22vw, 12rem));
        max-height: var(--viking-chart-max-height, clamp(13rem, 36vw, 17.5rem));
        height: auto;
      }
      .viking-chart-fill {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        min-height: var(--viking-chart-fill-min-height, clamp(16rem, 32vw, 17.5rem));
        max-height: var(--viking-chart-fill-max-height, clamp(17.5rem, 40vw, 21rem));
        height: 100%;
        aspect-ratio: auto;
      }
      .viking-chart-sparkline {
        width: 5rem;
        aspect-ratio: 3 / 1;
      }
      :host(.viking-chart-wide) .viking-chart-sparkline {
        width: 100%;
        aspect-ratio: auto;
        height: var(--viking-chart-sparkline-height, 2.5rem);
      }
      svg {
        display: block;
        width: 100%;
        height: 100%;
        background: transparent;
        overflow: visible;
      }
      .viking-chart:not(.viking-chart-fill):not(.viking-chart-sparkline) svg {
        min-height: var(--viking-chart-min-height, clamp(9.5rem, 22vw, 12rem));
        max-height: var(--viking-chart-max-height, clamp(13rem, 36vw, 17.5rem));
      }
      .viking-chart-fill svg {
        flex: 1 1 auto;
        min-height: var(--viking-chart-fill-min-height, clamp(16rem, 32vw, 17.5rem));
        max-height: var(--viking-chart-fill-max-height, clamp(17.5rem, 40vw, 21rem));
      }
      .viking-chart-sparkline svg {
        min-height: 0;
        border: none;
      }
      .viking-chart-compact svg {
        max-height: min(var(--viking-chart-max-height, clamp(13rem, 36vw, 17.5rem)), 13.75rem);
      }
      .viking-chart-grid {
        stroke: color-mix(in srgb, var(--viking-border) 55%, transparent);
        stroke-width: 1;
      }
      .viking-chart-axis-line,
      .viking-chart-tick {
        stroke: color-mix(in srgb, var(--viking-border) 85%, transparent);
        stroke-width: 1;
      }
      .viking-chart-axis-y,
      .viking-chart-axis-x {
        fill: var(--viking-text-muted);
        font-size: max(11px, var(--viking-chart-axis-size, 12px));
        font-family: var(--viking-font-family);
      }
      .viking-chart-line {
        fill: none;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
        vector-effect: non-scaling-stroke;
      }
      .viking-chart-area {
        opacity: 0.28;
        stroke: none;
      }
      .viking-chart-point {
        stroke: var(--viking-surface);
        stroke-width: 2;
        vector-effect: non-scaling-stroke;
      }
      .viking-chart-bar {
        opacity: 0.95;
      }
      .viking-chart-donut-slice {
        stroke: var(--viking-surface);
        stroke-width: 2;
      }
      .viking-chart-donut-hole {
        fill: var(--viking-surface);
      }
      .viking-chart-donut-total {
        fill: var(--viking-text);
        font-size: max(12px, min(16px, 3.5cqw));
        font-weight: 700;
        font-family: var(--viking-font-family);
      }
      .viking-chart-legend {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: var(--viking-space-2);
        margin-top: var(--viking-space-2);
        font-size: calc(var(--viking-font-size) * 0.9);
        color: var(--viking-text-muted);
      }
      .viking-chart-legend-item {
        display: inline-flex;
        align-items: center;
        gap: calc(var(--viking-space-1) / 1.5);
        line-height: 1.2;
      }
      .viking-chart-swatch {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        display: inline-block;
        flex-shrink: 0;
      }
      .sr-only {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }
    `,
  ],
})
export class VikingChart {
  protected readonly chartId = `vc-${Math.random().toString(36).slice(2, 9)}`;

  readonly kind = input<VikingChartKind>('line');
  readonly series = input<VikingChartSeries[]>([{ name: 'Series', data: [] }]);
  readonly categories = input<string[]>([]);
  readonly segments = input<VikingDonutSegment[]>([]);
  readonly label = input<string>('');
  readonly showArea = input<boolean>(false);
  readonly compact = input<boolean>(false);
  readonly fill = input<boolean>(false);
  readonly curve = input<VikingChartCurve>('linear');
  readonly showPoints = input<boolean>(false);
  readonly pointRadius = input<number>(4);
  readonly barWidth = input<number>(62);
  readonly barRadius = input<number>(4);
  readonly gutter = input<number | string | undefined>(undefined);
  readonly tickCount = input<number>(4);
  readonly showLegend = input<boolean | undefined>(undefined);
  readonly summary = input<string>('');

  protected readonly width = WIDTH;

  protected readonly isSparkline = computed(() => this.kind() === 'sparkline');

  protected readonly resolvedGutter = computed(() =>
    parseGutter(this.gutter(), this.isSparkline()),
  );

  protected readonly legendVisible = computed(() => {
    const explicit = this.showLegend();
    if (explicit !== undefined) {
      return explicit;
    }
    const kind = this.kind();
    if (kind === 'donut') {
      return this.segments().some(item => item.value > 0);
    }
    if (kind === 'sparkline') {
      return false;
    }
    if (kind === 'grouped-bar' || kind === 'stacked-bar') {
      return this.series().length > 0;
    }
    return this.series().length > 1;
  });

  protected readonly height = computed(() => {
    if (this.isSparkline()) {
      return HEIGHT_SPARKLINE;
    }
    return this.compact() ? HEIGHT_COMPACT : HEIGHT_DEFAULT;
  });

  protected readonly plotBottom = computed(() => this.height() - this.resolvedGutter().bottom);
  protected readonly plotTop = computed(() => this.resolvedGutter().top);
  protected readonly plotCy = computed(() => this.height() / 2);

  protected readonly donutInnerRadius = computed(() => {
    const plotH = this.plotBottom() - this.plotTop();
    const plotW = WIDTH - this.resolvedGutter().left - this.resolvedGutter().right;
    const outer = Math.min(plotW, plotH) / 2 - 6;
    return outer * 0.58;
  });

  protected readonly isBarKind = computed(() => {
    const kind = this.kind();
    return kind === 'bar' || kind === 'grouped-bar' || kind === 'stacked-bar';
  });

  protected readonly renderArea = computed(
    () => this.kind() === 'area' || this.showArea() || this.isSparkline(),
  );

  protected readonly renderPoints = computed(
    () => this.showPoints() && !this.isSparkline() && !this.isBarKind(),
  );

  protected toneVar = (tone: VikingTone): string => TONE_VARS[tone];

  protected readonly valueRange = computed(() => {
    const kind = this.kind();
    const series = this.series();

    if (kind === 'stacked-bar') {
      const count = series[0]?.data.length ?? 0;
      const sums = Array.from({ length: count }, (_, index) =>
        series.reduce((sum, item) => sum + (item.data[index] ?? 0), 0),
      );
      if (sums.length === 0) {
        return { min: 0, max: 1 };
      }
      const max = Math.max(...sums);
      return { min: 0, max: max || 1 };
    }

    const all = series.flatMap(item => item.data);
    if (all.length === 0) {
      return { min: 0, max: 1 };
    }
    const dataMin = Math.min(...all);
    const dataMax = Math.max(...all);

    if (this.isSparkline()) {
      if (dataMax === dataMin) {
        const pad = Math.max(Math.abs(dataMax) * 0.12, 0.5);
        return { min: dataMax - pad, max: dataMax + pad };
      }
      const padding = Math.max((dataMax - dataMin) * 0.12, 0.5);
      return { min: dataMin - padding, max: dataMax + padding };
    }

    const min = Math.min(0, ...all);
    const max = Math.max(...all);
    return { min, max: max === min ? max + 1 : max };
  });

  protected readonly gridLines = computed(() => {
    const bottom = this.plotBottom();
    const top = this.plotTop();
    const count = this.tickCount();
    const lines: number[] = [];
    for (let index = 0; index <= count; index += 1) {
      lines.push(top + ((bottom - top) * index) / count);
    }
    return lines;
  });

  protected readonly yAxisLabels = computed<AxisLabel[]>(() => {
    const { min, max } = this.valueRange();
    const bottom = this.plotBottom();
    const top = this.plotTop();
    const count = this.tickCount();
    const labels: AxisLabel[] = [];

    for (let index = 0; index <= count; index += 1) {
      const value = max - ((max - min) * index) / count;
      const y = top + ((bottom - top) * index) / count;
      labels.push({ x: 0, y, text: formatTick(value), anchor: 'end' });
    }

    return labels;
  });

  protected readonly xAxisLabels = computed<AxisLabel[]>(() => {
    if (this.kind() === 'donut' || this.isSparkline()) {
      return [];
    }

    const primary = this.series()[0];
    const count = primary?.data.length ?? 0;
    if (count === 0) {
      return [];
    }

    const cats = this.categories();
    const plotWidth = WIDTH - this.resolvedGutter().left - this.resolvedGutter().right;
    const maxLabels = 6;
    const step = Math.max(1, Math.ceil(count / maxLabels));
    const labels: AxisLabel[] = [];

    for (let index = 0; index < count; index += step) {
      const x =
        this.resolvedGutter().left +
        (count === 1 ? plotWidth / 2 : (index / Math.max(1, count - 1)) * plotWidth);
      const text = cats[index] ? truncateLabel(cats[index]) : `${index + 1}`;
      labels.push({ x, y: this.height(), text, anchor: 'middle' });
    }

    if ((count - 1) % step !== 0 && count > 1) {
      const last = count - 1;
      const x = this.resolvedGutter().left + (last / Math.max(1, count - 1)) * plotWidth;
      const text = cats[last] ? truncateLabel(cats[last]) : `${last + 1}`;
      if (!labels.some(item => item.text === text)) {
        labels.push({ x, y: this.height(), text, anchor: 'middle' });
      }
    }

    return labels;
  });

  protected readonly xTickMarks = computed<TickMark[]>(() => {
    const bottom = this.plotBottom();
    return this.xAxisLabels().map(label => ({
      x: label.x,
      y1: bottom,
      y2: bottom + 5,
    }));
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
    const plotWidth = WIDTH - this.resolvedGutter().left - this.resolvedGutter().right;
    const buildPath = this.curve() === 'smooth' ? buildSmoothPath : buildLinearPath;

    return this.series().map(item => {
      const points = item.data.map((value, index) => {
        const x =
          this.resolvedGutter().left + (index / Math.max(1, item.data.length - 1)) * plotWidth;
        const y = bottom - ((value - min) / range) * plotHeight;
        return { x, y };
      });
      const line = buildPath(points);
      const area = `${line} L${WIDTH - this.resolvedGutter().right},${bottom} L${this.resolvedGutter().left},${bottom} Z`;
      return { name: item.name, tone: item.tone ?? 'accent', line, area };
    });
  });

  protected readonly linePoints = computed<ChartPoint[]>(() => {
    const all = this.series().flatMap(item => item.data);
    if (all.length === 0) {
      return [];
    }

    const { min, max } = this.valueRange();
    const range = max - min || 1;
    const bottom = this.plotBottom();
    const top = this.plotTop();
    const plotHeight = bottom - top;
    const plotWidth = WIDTH - this.resolvedGutter().left - this.resolvedGutter().right;

    return this.series().flatMap(item =>
      item.data.map((value, index) => {
        const x =
          this.resolvedGutter().left + (index / Math.max(1, item.data.length - 1)) * plotWidth;
        const y = bottom - ((value - min) / range) * plotHeight;
        return { x, y, tone: item.tone ?? 'accent' };
      }),
    );
  });

  protected readonly barRects = computed<BarRect[]>(() => {
    const kind = this.kind();
    if (kind === 'stacked-bar') {
      return this.stackedBarRects();
    }
    if (kind === 'grouped-bar') {
      return this.groupedBarRects();
    }
    return this.singleBarRects();
  });

  private readonly singleBarRects = computed<BarRect[]>(() => {
    const primary = this.series()[0];
    if (!primary?.data.length) {
      return [];
    }

    const { min, max } = this.valueRange();
    const range = max - min || 1;
    const bottom = this.plotBottom();
    const top = this.plotTop();
    const plotHeight = bottom - top;
    const plotWidth = WIDTH - this.resolvedGutter().left - this.resolvedGutter().right;
    const widthPercent = this.barWidth();
    const slotWidth = plotWidth / primary.data.length;
    const barWidth = resolveBarWidth(slotWidth, primary.data.length, widthPercent);

    return primary.data.map((value, index) => {
      const normalized = (value - min) / range;
      const height = Math.max(0, normalized * plotHeight);
      const x = this.resolvedGutter().left + index * slotWidth + (slotWidth - barWidth) / 2;
      const y = bottom - height;
      return {
        x,
        y,
        width: barWidth,
        height,
        tone: primary.tone ?? 'accent',
        radiusTop: true,
      };
    });
  });

  private readonly groupedBarRects = computed<BarRect[]>(() => {
    const series = this.series();
    const count = series[0]?.data.length ?? 0;
    if (!count) {
      return [];
    }

    const { min, max } = this.valueRange();
    const range = max - min || 1;
    const bottom = this.plotBottom();
    const top = this.plotTop();
    const plotHeight = bottom - top;
    const plotWidth = WIDTH - this.resolvedGutter().left - this.resolvedGutter().right;
    const groupWidth = plotWidth / count;
    const widthPercent = this.barWidth();
    const groupBarWidth = resolveBarWidth(groupWidth, count, widthPercent);
    const barWidth = Math.max(3, groupBarWidth / series.length);
    const rects: BarRect[] = [];

    for (let index = 0; index < count; index += 1) {
      const groupStart = this.resolvedGutter().left + index * groupWidth;
      const groupInner = groupBarWidth;
      const groupOffset = (groupWidth - groupInner) / 2;

      series.forEach((item, seriesIndex) => {
        const value = item.data[index] ?? 0;
        const normalized = (value - min) / range;
        const height = Math.max(0, normalized * plotHeight);
        const x = groupStart + groupOffset + seriesIndex * barWidth;
        const y = bottom - height;
        rects.push({
          x,
          y,
          width: barWidth - 1,
          height,
          tone: item.tone ?? 'accent',
          radiusTop: true,
        });
      });
    }

    return rects;
  });

  private readonly stackedBarRects = computed<BarRect[]>(() => {
    const series = this.series();
    const count = series[0]?.data.length ?? 0;
    if (!count) {
      return [];
    }

    const { max } = this.valueRange();
    const range = max || 1;
    const bottom = this.plotBottom();
    const top = this.plotTop();
    const plotHeight = bottom - top;
    const plotWidth = WIDTH - this.resolvedGutter().left - this.resolvedGutter().right;
    const widthPercent = this.barWidth();
    const slotWidth = plotWidth / count;
    const barWidth = resolveBarWidth(slotWidth, count, widthPercent);
    const rects: BarRect[] = [];

    for (let index = 0; index < count; index += 1) {
      let cursor = bottom;
      const x = this.resolvedGutter().left + index * slotWidth + (slotWidth - barWidth) / 2;

      series.forEach((item, seriesIndex) => {
        const value = item.data[index] ?? 0;
        const height = Math.max(0, (value / range) * plotHeight);
        cursor -= height;
        rects.push({
          x,
          y: cursor,
          width: barWidth,
          height,
          tone: item.tone ?? 'accent',
          radiusTop: seriesIndex === series.length - 1,
        });
      });
    }

    return rects;
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
    const plotH = this.plotBottom() - this.plotTop();
    const plotW = WIDTH - this.resolvedGutter().left - this.resolvedGutter().right;
    const outer = Math.min(plotW, plotH) / 2 - 6;
    const inner = outer * 0.58;
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
