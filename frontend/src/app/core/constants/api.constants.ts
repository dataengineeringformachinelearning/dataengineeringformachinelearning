import { environment } from '../../../environments/environment';

export const API_ENDPOINTS = {
  MODEL: {
    LATEST: `${environment.backendUrl}/api/v1/model/latest`,
    TRAIN: `${environment.backendUrl}/api/v1/model/train`,
  },
  SYSTEM_STATUS: {
    ENDPOINTS: `${environment.backendUrl}/api/v1/system-status/endpoints`,
  },
  AGENT: {
    REPORT_ISSUE: `${environment.backendUrl}/api/v1/agent/report-issue`,
  },
  TELEMETRY: {
    ENDPOINTS: `${environment.backendUrl}/api/v1/telemetry/endpoints`,
  }
};
