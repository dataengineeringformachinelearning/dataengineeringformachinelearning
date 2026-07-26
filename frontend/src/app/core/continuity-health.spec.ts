import { continuityFromReady } from './continuity-health';

describe('continuityFromReady', () => {
  it('maps ok forjd_health to ok', () => {
    expect(continuityFromReady({ status: 'ready', forjd_health: 'ok' })).toBe('ok');
  });

  it('maps degraded and unreachable explicitly', () => {
    expect(continuityFromReady({ forjd_health: 'degraded' })).toBe('degraded');
    expect(continuityFromReady({ forjd_health: 'unreachable' })).toBe('unreachable');
  });

  it('does not treat missing forjd_health as optimistic ok', () => {
    expect(continuityFromReady({ status: 'ready' })).toBe('degraded');
    expect(continuityFromReady({ status: 'ready', mode: 'degraded' })).toBe('degraded');
  });

  it('treats null body as unreachable', () => {
    expect(continuityFromReady(null)).toBe('unreachable');
  });
});
