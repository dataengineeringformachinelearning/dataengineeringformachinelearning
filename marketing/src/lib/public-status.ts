export function reportedNumber(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') {
    return null;
  }

  if (typeof value === 'string' && value.trim() === '') {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function formatUptime(value: unknown): string {
  const uptime = reportedNumber(value);
  return uptime === null ? 'Not reported' : `${uptime.toFixed(2)}%`;
}

export function formatLatency(value: unknown): string {
  const latency = reportedNumber(value);
  return latency === null ? 'Not reported' : `${Math.round(latency)} ms`;
}
