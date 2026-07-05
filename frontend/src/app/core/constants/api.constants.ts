import { environment } from '../../../environments/environment';

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
    ENDPOINTS: `${environment.backendUrl}/api/v1/telemetry/endpoints`,
    COOKIE_CONSENT: `${environment.backendUrl}/api/v1/telemetry/cookie-consent`,
  },
  ANALYTICS: {
    INCIDENTS: `${environment.backendUrl}/api/v1/analytics/incidents`,
    PLAYBOOKS: `${environment.backendUrl}/api/v1/analytics/playbooks`,
  },
};
