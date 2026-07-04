/** E.164 phone normalization and validation for Firebase MFA / SMS flows. */

const E164_PATTERN = /^\+[1-9]\d{6,14}$/;

/**
 * Normalize user input toward E.164: strip formatting, ensure leading +.
 * US numbers without country code get +1 prefix when 10 digits.
 */
export const normalizePhoneE164 = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }

  const digitsOnly = trimmed.replace(/[^\d+]/g, '');
  if (digitsOnly.startsWith('+')) {
    return `+${digitsOnly.slice(1).replace(/\D/g, '')}`;
  }

  const digits = digitsOnly.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  return `+${digits}`;
};

export const isValidPhoneE164 = (phone: string): boolean => E164_PATTERN.test(phone);

export const phoneFormatHint =
  'Use international E.164 format, e.g. +14155552671 (country code + number, no spaces).';

export const phoneValidationError = (phone: string): string | null => {
  const normalized = normalizePhoneE164(phone);
  if (!normalized || normalized === '+') {
    return 'Phone number is required.';
  }
  if (!isValidPhoneE164(normalized)) {
    return phoneFormatHint;
  }
  return null;
};

export const mapFirebasePhoneError = (code: string | undefined): string => {
  if (code === 'auth/invalid-phone-number') {
    return phoneFormatHint;
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Wait a moment and try again.';
  }
  if (code === 'auth/captcha-check-failed') {
    return 'reCAPTCHA verification failed. Refresh and try again.';
  }
  return 'Failed to send verification code. Check the number and try again.';
};

export const mapFirebaseMfaError = (code: string | undefined): string => {
  if (code === 'auth/invalid-verification-code') {
    return 'The verification code is incorrect or expired. Request a new code and try again.';
  }
  if (code === 'auth/code-expired') {
    return 'The verification code expired. Request a new code and try again.';
  }
  if (code === 'auth/session-expired') {
    return 'Your sign-in session expired. Sign in again to continue MFA verification.';
  }
  return mapFirebasePhoneError(code);
};

/** Log Firebase auth errors without dumping full error objects to the console. */
export const logFirebaseAuthError = (context: string, error: unknown): void => {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: string }).code)
      : 'unknown';
  console.warn(`[Auth] ${context}: ${code}`);
};

