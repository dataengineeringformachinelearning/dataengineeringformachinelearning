import { describe, expect, it } from 'vitest';
import {
  emptyUptimeHistory,
  resolveUptimeHistory,
  toUptimeHistoryDataPoints,
} from './uptime.utils';

describe('uptime.utils', () => {
  it('normalizes API statuses without losing the no-data state', () => {
    expect(
      toUptimeHistoryDataPoints([
        { date: '2026-07-13', status: 'major outage' },
        { date: '2026-07-14', status: 'partial_outage' },
        { date: '2026-07-15', status: 'no_data' },
        { date: '2026-07-16', status: 'operational' },
      ]),
    ).toEqual([
      { date: '2026-07-13', status: 'down' },
      { date: '2026-07-14', status: 'partial' },
      { date: '2026-07-15', status: 'no_data' },
      { date: '2026-07-16', status: 'up' },
    ]);
  });

  it('falls back to explicit no_data segments when history is empty', () => {
    const history = resolveUptimeHistory([], 3);
    expect(history).toHaveLength(3);
    expect(history.every(point => point.status === 'no_data')).toBe(true);
    expect(emptyUptimeHistory(3)).toHaveLength(3);
  });

  it('keeps real history when present', () => {
    expect(resolveUptimeHistory([{ date: '2026-07-13', status: 'up' }])).toEqual([
      { date: '2026-07-13', status: 'up' },
    ]);
  });
});
