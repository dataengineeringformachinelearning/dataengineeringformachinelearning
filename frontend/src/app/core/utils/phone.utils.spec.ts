import { describe, expect, it } from 'vitest';
import {
  isValidPhoneE164,
  normalizePhoneE164,
  phoneValidationError,
} from './phone.utils';

describe('phone.utils', () => {
  it('normalizes US numbers without country code', () => {
    expect(normalizePhoneE164('4155552671')).toBe('+14155552671');
  });

  it('preserves E.164 numbers', () => {
    expect(normalizePhoneE164('+14155552671')).toBe('+14155552671');
  });

  it('validates E.164 format', () => {
    expect(isValidPhoneE164('+14155552671')).toBe(true);
    expect(isValidPhoneE164('4155552671')).toBe(false);
  });

  it('returns validation errors for invalid input', () => {
    expect(phoneValidationError('123')).toContain('E.164');
    expect(phoneValidationError('')).toContain('required');
  });
});
