import { FluxChartSeries, FluxTone } from '@deml/flux-material';

export interface FluxDonutSegment {
  label: string;
  value: number;
  tone?: FluxTone;
}

const SEVERITY_TONES: Record<string, FluxTone> = {
  low: 'accent',
  medium: 'muted',
  high: 'warning',
  critical: 'danger',
};

export const severityToTone = (severity: string): FluxTone =>
  SEVERITY_TONES[severity.toLowerCase()] ?? 'muted';

export const toFluxLineSeries = (
  name: string,
  data: number[],
  tone: FluxTone = 'accent',
): FluxChartSeries[] => [{ name, data, tone }];

export const toFluxBarSeries = (
  name: string,
  data: number[],
  tone: FluxTone = 'accent',
): FluxChartSeries[] => [{ name, data, tone }];

export const toFluxDonutSegments = (
  labels: string[],
  values: number[],
): FluxDonutSegment[] =>
  labels.map((label, index) => ({
    label: label.charAt(0).toUpperCase() + label.slice(1),
    value: values[index] ?? 0,
    tone: severityToTone(label),
  }));

export const hasChartValues = (data: number[]): boolean => data.some(value => value > 0);

export const hasDonutValues = (segments: FluxDonutSegment[]): boolean =>
  segments.some(segment => segment.value > 0);
