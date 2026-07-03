import { HttpErrorResponse } from '@angular/common/http';

/** Extract a user-facing message from a Django Ninja / Angular HTTP error. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error;
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    if (body && typeof body === 'object') {
      const record = body as Record<string, unknown>;
      const detail = record['detail'];
      if (typeof detail === 'string' && detail) {
        return detail;
      }
      const message = record['message'];
      if (typeof message === 'string' && message) {
        return message;
      }
      const error = record['error'];
      if (typeof error === 'string' && error) {
        return error;
      }
    }
    if (err.status === 403) {
      return (
        'Permission denied. Saving sites requires multi-factor authentication (MFA). ' +
        'Enroll MFA under Account, then sign out and sign back in to complete verification.'
      );
    }
    if (err.status === 404) {
      return 'Status page not found. Refresh the Sites page and try again.';
    }
    if (err.status === 401) {
      return 'Your session expired. Sign in again and retry.';
    }
  }
  return fallback;
}