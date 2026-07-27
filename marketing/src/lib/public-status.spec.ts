import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatLatency, formatUptime, reportedNumber } from './public-status.ts';

describe('public status metrics', () => {
  it('does not turn absent or empty API values into zero', () => {
    for (const value of [null, undefined, '', '   ', false, [], {}, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.equal(reportedNumber(value), null);
      assert.equal(formatUptime(value), 'Not reported');
      assert.equal(formatLatency(value), 'Not reported');
    }
  });

  it('preserves valid numeric zero and formats reported values', () => {
    assert.equal(formatUptime(0), '0.00%');
    assert.equal(formatUptime('99.987'), '99.99%');
    assert.equal(formatLatency('0'), '0 ms');
    assert.equal(formatLatency(12.6), '13 ms');
  });
});
