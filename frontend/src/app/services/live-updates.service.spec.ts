import { describe, expect, it } from 'vitest';
import { parseSseFrames } from './live-updates.service';

describe('parseSseFrames', () => {
  it('parses complete event frames and returns the unparsed rest', () => {
    const buffer =
      'event: ready\ndata: {"cursor":null,"poll_seconds":10}\n\n' +
      'event: projections\ndata: {"count":3,"cursor":"2026-07-19T00:00:07+00:00"}\n\n' +
      'event: proj'; // incomplete tail stays buffered

    const { events, rest } = parseSseFrames(buffer);

    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: 'ready', data: { cursor: null, poll_seconds: 10 } });
    expect(events[1].type).toBe('projections');
    expect(events[1].data['count']).toBe(3);
    expect(rest).toBe('event: proj');
  });

  it('skips keepalive comments and malformed frames', () => {
    const buffer =
      ': keepalive\n\n' +
      'event: projections\ndata: not-json\n\n' +
      'event: end\ndata: {"cursor":"c1"}\n\n';

    const { events, rest } = parseSseFrames(buffer);

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'end', data: { cursor: 'c1' } });
    expect(rest).toBe('');
  });

  it('defaults the event type to message when only data is present', () => {
    const { events } = parseSseFrames('data: {"ok":true}\n\n');
    expect(events).toEqual([{ type: 'message', data: { ok: true } }]);
  });

  it('returns everything as rest when no complete frame arrived yet', () => {
    const { events, rest } = parseSseFrames('event: ready\ndata: {"cursor"');
    expect(events).toHaveLength(0);
    expect(rest).toBe('event: ready\ndata: {"cursor"');
  });
});
