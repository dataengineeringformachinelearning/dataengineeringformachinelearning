import { describe, expect, it } from 'vitest';
import { formatServiceName } from './formatter.utils';

describe('formatServiceName', () => {
  it('preserves human-authored acronyms', () => {
    expect(formatServiceName('DEML API')).toBe('DEML API');
  });

  it('still cleans legacy route-derived service names', () => {
    expect(formatServiceName('localhost:8000 - api v1 system status status pages')).toBe(
      'Status Pages',
    );
  });
});
