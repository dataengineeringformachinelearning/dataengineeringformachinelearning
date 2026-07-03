import { VikingChartSeries, VikingTone } from '@dataengineeringformachinelearning/viking-ui';

export interface VikingDonutSegment {
  label: string;
  value: number;
  tone?: VikingTone;
}

const SEVERITY_TONES: Record<string, VikingTone> = {
  low: 'accent',
  medium: 'muted',
  high: 'warning',
  critical: 'danger',
};

export const severityToTone = (severity: string): VikingTone =>
  SEVERITY_TONES[severity.toLowerCase()] ?? 'muted';

export const toVikingLineSeries = (
  name: string,
  data: number[],
  tone: VikingTone = 'accent',
): VikingChartSeries[] => [{ name, data, tone }];

export const toVikingBarSeries = (
  name: string,
  data: number[],
  tone: VikingTone = 'accent',
): VikingChartSeries[] => [{ name, data, tone }];

export const toVikingDonutSegments = (labels: string[], values: number[]): VikingDonutSegment[] =>
  labels.map((label, index) => ({
    label: label.charAt(0).toUpperCase() + label.slice(1),
    value: values[index] ?? 0,
    tone: severityToTone(label),
  }));

export const hasChartValues = (data: number[]): boolean => data.some(value => value > 0);

export const hasDonutValues = (segments: VikingDonutSegment[]): boolean =>
  segments.some(segment => segment.value > 0);
