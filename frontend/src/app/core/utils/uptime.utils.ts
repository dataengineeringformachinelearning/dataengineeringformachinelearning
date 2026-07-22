import type { UptimeHistoryDataPoint } from '@dataengineeringformachinelearning/viking-ui';

export interface UptimeHistorySourcePoint {
  date: string;
  status: string;
  uptime?: number | null;
}

const normalizeUptimeHistoryStatus = (status: string): UptimeHistoryDataPoint['status'] => {
  const normalized = status.toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized === 'no_data') return 'no_data';
  if (normalized === 'outage' || normalized === 'major_outage' || normalized === 'down') {
    return 'down';
  }
  if (normalized === 'degraded' || normalized === 'partial_outage' || normalized === 'partial') {
    return 'partial';
  }
  return 'up';
};

export const toUptimeHistoryDataPoints = (
  history: readonly UptimeHistorySourcePoint[],
): UptimeHistoryDataPoint[] =>
  history.map(day => ({
    date: day.date,
    status: normalizeUptimeHistoryStatus(day.status),
  }));

/** Explicit empty timeline — muted segments, never a blank track. */
export const emptyUptimeHistory = (days = 30): UptimeHistoryDataPoint[] =>
  toUptimeHistoryDataPoints(
    Array.from({ length: days }, (_, index) => {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - (days - 1) + index);
      return {
        date: date.toISOString().slice(0, 10),
        status: 'no_data',
      };
    }),
  );

export const resolveUptimeHistory = (
  history?: readonly UptimeHistorySourcePoint[] | null,
  days = 30,
): UptimeHistoryDataPoint[] => {
  const source = history ?? [];
  if (source.length > 0) {
    return toUptimeHistoryDataPoints(source);
  }
  return emptyUptimeHistory(days);
};
