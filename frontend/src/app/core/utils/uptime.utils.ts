import type { UptimeHistoryDataPoint } from '@dataengineeringformachinelearning/viking-ui';

export interface UptimeHistorySourcePoint {
  date: string;
  status: string;
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
