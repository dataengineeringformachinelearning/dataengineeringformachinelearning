/**
 * Shared continuity health signal for DEML control-plane / FORJD soft probes.
 * Prefer this over optimistic defaults — start at `checking`, never invent `ok`.
 */

export type ContinuityHealthSignal = 'ok' | 'degraded' | 'unreachable' | 'checking';

/** Map DEML `/api/v1/ready` body fields onto a continuity signal. */
export function continuityFromReady(body: {
  forjd_health?: string | null;
  mode?: string | null;
  status?: string | null;
} | null | undefined): ContinuityHealthSignal {
  if (!body) {
    return 'unreachable';
  }
  const forjd = String(body.forjd_health || '').toLowerCase();
  if (forjd === 'ok') {
    return 'ok';
  }
  if (forjd === 'degraded') {
    return 'degraded';
  }
  if (forjd === 'unreachable') {
    return 'unreachable';
  }
  // Missing forjd_health on a ready response is a contract gap — surface degraded.
  const mode = String(body.mode || '').toLowerCase();
  if (mode === 'degraded') {
    return 'degraded';
  }
  if (String(body.status || '').toLowerCase() === 'ready' && !forjd) {
    return 'degraded';
  }
  return 'unreachable';
}
