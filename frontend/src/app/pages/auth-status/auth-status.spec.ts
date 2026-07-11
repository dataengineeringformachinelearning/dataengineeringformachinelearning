import { describe, expect, it } from 'vitest';
import { isTrustedParentOrigin, resolveParentOrigin } from './auth-status';

describe('AuthStatus origin validation', () => {
  it('accepts DEML-owned production and local origins', () => {
    expect(isTrustedParentOrigin('https://dataengineeringformachinelearning.com')).toBe(true);
    expect(isTrustedParentOrigin('https://ui.dataengineeringformachinelearning.com')).toBe(true);
    expect(isTrustedParentOrigin('https://backend.deml.app')).toBe(true);
    expect(isTrustedParentOrigin('http://localhost:4321')).toBe(true);
  });

  it('rejects lookalike and malformed origins', () => {
    expect(isTrustedParentOrigin('https://deml.app.evil.example')).toBe(false);
    expect(
      isTrustedParentOrigin('https://dataengineeringformachinelearning.com.evil.example'),
    ).toBe(false);
    expect(isTrustedParentOrigin('not-an-origin')).toBe(false);
  });

  it('uses a trusted referrer only when an explicit origin is unavailable', () => {
    expect(
      resolveParentOrigin(null, 'https://ui.dataengineeringformachinelearning.com/components'),
    ).toBe('https://ui.dataengineeringformachinelearning.com');
    expect(
      resolveParentOrigin('https://evil.example', 'https://backend.deml.app/api/v1/docs'),
    ).toBe('https://backend.deml.app');
  });
});
