export interface TemporalInsight {
  forecast: number | null;
  status: string | null;
  backend: string | null;
  sampleCount: number | null;
  scoredAt: string | null;
  usesNorse: boolean | null;
}

const normalize = (value: string | null | undefined): string =>
  (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const isCollecting = (status: string): boolean =>
  ['insufficient_data', 'pending', 'training'].includes(status);

const isUnavailable = (status: string): boolean =>
  ['error', 'failed', 'unavailable'].includes(status);

const isUnqualifiedZero = (insight: TemporalInsight | undefined, status: string): boolean =>
  !status && !insight?.backend && !insight?.scoredAt && insight?.forecast === 0;

export const formatTemporalBackend = (backend: string | null | undefined): string | null => {
  const value = normalize(backend);
  if (!value) return null;
  const known: Record<string, string> = {
    gru_mlp: 'GRU/MLP',
    gru_mlp_fallback: 'GRU/MLP fallback',
    mlp: 'MLP',
    norse_lif: 'Norse LIF',
    norse_ssn: 'Norse SSN',
  };
  return (
    known[value] ??
    value
      .split('_')
      .map(token =>
        ['ai', 'gru', 'lif', 'ml', 'mlp', 'ssn'].includes(token)
          ? token.toUpperCase()
          : `${token[0].toUpperCase()}${token.slice(1)}`,
      )
      .join(' ')
  );
};

export const temporalEngineLabel = (insight: TemporalInsight | undefined): string => {
  const status = normalize(insight?.status);
  if (isUnqualifiedZero(insight, status)) return 'Collecting telemetry';
  if (isCollecting(status)) return 'Collecting telemetry';
  if (isUnavailable(status)) return 'Temporarily unavailable';
  const backend = formatTemporalBackend(insight?.backend);
  if (backend) return backend;
  if (status === 'ready' || insight?.forecast != null) return 'Temporal model ready';
  return 'Collecting telemetry';
};

export const temporalEngineDetail = (insight: TemporalInsight | undefined): string => {
  const status = normalize(insight?.status);
  if (isUnqualifiedZero(insight, status)) return 'Temporal status unknown';
  if (isCollecting(status)) {
    return insight?.sampleCount != null
      ? `Collecting telemetry · ${insight.sampleCount.toLocaleString()} samples`
      : 'Collecting telemetry';
  }
  if (isUnavailable(status)) return 'Temporal inference unavailable';
  if (status === 'stale') {
    return insight?.sampleCount != null
      ? `Stale inference · ${insight.sampleCount.toLocaleString()} samples`
      : 'Stale inference';
  }
  return insight?.sampleCount != null
    ? `${insight.sampleCount.toLocaleString()} samples scored`
    : 'Temporal inference engine';
};

export const temporalRiskLabel = (insight: TemporalInsight | undefined): string => {
  const status = normalize(insight?.status);
  if (isUnqualifiedZero(insight, status)) return 'Collecting telemetry';
  if (isCollecting(status)) return 'Collecting telemetry';
  if (isUnavailable(status)) return 'Inference unavailable';
  const score = insight?.forecast;
  if (score == null) return 'Awaiting inference';
  const risk = score <= 33 ? 'Low risk' : score <= 66 ? 'Moderate risk' : 'High risk';
  return status === 'stale' ? `${risk} · stale` : risk;
};

export const formatTemporalScore = (insight: TemporalInsight | undefined): string => {
  const status = normalize(insight?.status);
  if (
    isUnqualifiedZero(insight, status) ||
    isCollecting(status) ||
    isUnavailable(status) ||
    insight?.forecast == null
  ) {
    return '—';
  }
  return insight.forecast.toFixed(2);
};
