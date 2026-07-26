/**
 * Shared user-facing continuity copy across DEML status surfaces.
 * Keep tone identical: calm, actionable, one Retry affordance.
 */

// --- Status / explore / isolated-status network failures ---
export const STATUS_CONNECT_HEADING = 'Unable to connect';
export const STATUS_CONNECT_BODY =
  "We couldn't reach the status service. Check your connection, then retry.";
export const STATUS_RETRY_LABEL = 'Retry';

// --- Auth / FORJD control-plane degraded (dashboard + analytics + status) ---
export const FORJD_FALLBACK_BODY =
  'Live FORJD data is temporarily unavailable. Showing the last successful view when possible.';
export const FORJD_UNAVAILABLE_BODY =
  'FORJD data is unavailable for this account. Check tenant mapping, then retry.';

// --- Generic load failure (dashboard / analytics) ---
export const LOAD_FAILED_BODY = "We couldn't load this view. Check your connection, then retry.";

// --- Offline ---
export const OFFLINE_HEADING = 'You are offline';
export const OFFLINE_BODY =
  'Reconnect to the internet, then retry. Cached views may be incomplete.';
