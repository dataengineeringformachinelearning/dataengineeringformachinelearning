import {
  formatTemporalScore,
  temporalEngineDetail,
  temporalEngineLabel,
  temporalRiskLabel,
  type TemporalInsight,
} from './temporal.utils';

const insight = (overrides: Partial<TemporalInsight> = {}): TemporalInsight => ({
  forecast: null,
  status: null,
  backend: null,
  sampleCount: null,
  scoredAt: null,
  usesNorse: null,
  ...overrides,
});

describe('temporal presentation', () => {
  it('shows persisted ready backend metadata', () => {
    const value = insight({ status: 'ready', backend: 'norse_lif', forecast: 14.25 });
    expect(temporalEngineLabel(value)).toBe('Norse LIF');
    expect(formatTemporalScore(value)).toBe('14.25');
  });

  it('shows insufficient data as telemetry collection', () => {
    const value = insight({ status: 'insufficient_data', forecast: 0, sampleCount: 4 });
    expect(temporalEngineLabel(value)).toBe('Collecting telemetry');
    expect(temporalRiskLabel(value)).toBe('Collecting telemetry');
    expect(formatTemporalScore(value)).toBe('—');
  });

  it('preserves a real zero score as low risk', () => {
    const value = insight({
      status: 'ready',
      backend: 'gru_mlp_fallback',
      forecast: 0,
      scoredAt: '2026-07-23T00:00:00Z',
      usesNorse: false,
    });
    expect(temporalEngineLabel(value)).toBe('GRU/MLP fallback');
    expect(temporalRiskLabel(value)).toBe('Low risk');
    expect(formatTemporalScore(value)).toBe('0.00');
  });

  it('does not treat the legacy zero/false defaults as completed inference', () => {
    const value = insight({ forecast: 0, usesNorse: false });
    expect(temporalEngineLabel(value)).toBe('Collecting telemetry');
    expect(temporalEngineDetail(value)).toBe('Temporal status unknown');
    expect(temporalRiskLabel(value)).toBe('Collecting telemetry');
    expect(formatTemporalScore(value)).toBe('—');
  });

  it('does not present an invalid score as a successful inference', () => {
    const value = insight({ status: 'error', backend: 'norse_lif', forecast: 91 });
    expect(temporalEngineLabel(value)).toBe('Temporarily unavailable');
    expect(temporalRiskLabel(value)).toBe('Inference unavailable');
    expect(formatTemporalScore(value)).toBe('—');
  });

  it('discloses stale persisted inference', () => {
    const value = insight({
      status: 'stale',
      backend: 'norse_lif',
      forecast: 0,
      sampleCount: 128,
    });
    expect(temporalEngineLabel(value)).toBe('Norse LIF');
    expect(temporalEngineDetail(value)).toBe('Stale inference · 128 samples');
    expect(temporalRiskLabel(value)).toBe('Low risk · stale');
    expect(formatTemporalScore(value)).toBe('0.00');
  });
});
