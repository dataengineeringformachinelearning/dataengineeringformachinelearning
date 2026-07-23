import { environment } from '../../../environments/environment';

/**
 * Stable DEML Django BFF paths used by Angular.
 *
 * The browser never calls FORJD and never holds ``fjsvc_`` tokens. All FORJD
 * data-plane work is adapted through these Django routes (see
 * docs/FORJD_INTEGRATION.md).
 */
export const API_ENDPOINTS = {
  ML: {
    LATEST: `${environment.backendUrl}/api/v1/ml/latest`,
    TRAIN: `${environment.backendUrl}/api/v1/ml/train`,
    TEMPORAL_FORECAST: `${environment.backendUrl}/api/v1/ml/temporal-forecast`,
  },
  SYSTEM_STATUS: {
    ENDPOINTS: `${environment.backendUrl}/api/v1/system-status/endpoints`,
    STATUS_PAGES: `${environment.backendUrl}/api/v1/system-status/status_pages`,
    SERVICES: `${environment.backendUrl}/api/v1/system-status/services`,
    INCIDENTS: `${environment.backendUrl}/api/v1/system-status/incidents`,
  },
  AGENT: {
    REPORT_ISSUE: `${environment.backendUrl}/api/v1/agent/report-issue`,
    VULNERABILITIES: `${environment.backendUrl}/api/v1/agent/vulnerabilities`,
  },
  TELEMETRY: {
    SEALED_INGEST: `${environment.backendUrl}/api/v1/ingest`,
    SEALED_BATCH: `${environment.backendUrl}/api/v1/ingest/events:batch`,
    COOKIE_CONSENT: `${environment.backendUrl}/api/v1/telemetry/cookie-consent`,
  },
  SESSIONS: {
    ROOT: `${environment.backendUrl}/api/v1/sessions`,
  },
  FORJD: {
    /** Mapped FORJD tenant id for the authenticated DEML account (never the token). */
    TENANT: `${environment.backendUrl}/api/v1/forjd/tenant`,
    CAPABILITIES: `${environment.backendUrl}/api/v1/forjd/capabilities`,
  },
  ANALYTICS: {
    OVERVIEW: `${environment.backendUrl}/api/v1/analytics/overview`,
    TENANTS: `${environment.backendUrl}/api/v1/analytics/tenants`,
    /** Django SSE bridge over FORJD projection cursor polls — not Firestore. */
    LIVE: `${environment.backendUrl}/api/v1/analytics/live`,
    INCIDENTS: `${environment.backendUrl}/api/v1/analytics/incidents`,
    PLAYBOOKS: `${environment.backendUrl}/api/v1/analytics/playbooks`,
  },
  EXPORTS: {
    LIST: `${environment.backendUrl}/api/v1/exports/`,
    CREATE: `${environment.backendUrl}/api/v1/exports/`,
    DETAIL: (id: string) => `${environment.backendUrl}/api/v1/exports/${id}`,
    DOWNLOAD: (id: string) => `${environment.backendUrl}/api/v1/exports/${id}/download`,
  },
};
