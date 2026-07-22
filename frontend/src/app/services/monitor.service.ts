import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_ENDPOINTS } from '../core/constants/api.constants';

export interface EndpointData {
  id: string;
  url: string;
  last_tested: string;
  status_code: number;
  response_time: string;
  ip_address: string;
  is_active: boolean;
}

export interface StatusPageData {
  id: string;
  title: string;
  slug: string;
  description: string;
  is_published?: boolean;
  google_analytics_id?: string;
  microsoft_clarity_id?: string;
  cloudflare_analytics_id?: string;
  created_at: string;
  user_id: number | null;
  is_pro_verified?: boolean;
  cumulative_sla?: number;
  overall_uptime?: number;
  uptime_history?: { date: string; status: string; uptime: number | null }[];
  p99_latency?: number;
  total_requests?: number;
  threats_detected_24h?: number;
  /** Embedded on the public slug payload so anonymous visitors see services. */
  services?: MonitoredServiceData[];
  incidents?: IncidentData[];
}

export interface MonitoredServiceData {
  id: string;
  name: string;
  url: string;
  status_page_id: string;
  created_at: string;
  status?: string;
  sla?: number | null;
  uptime_history?: { date: string; status: string; uptime: number | null }[];
  p99_latency?: number | null;
}

export interface IncidentData {
  id: string;
  title: string;
  message: string;
  status: string;
  status_page_id: string;
  created_at: string;
  updated_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class MonitorService {
  private http = inject(HttpClient);

  public incidentsMap = signal<Record<string, IncidentData[]>>({});
  public servicesMap = signal<Record<string, MonitoredServiceData[]>>({});

  /** Seed maps from a public slug payload (embedded arrays, no auth needed). */
  seedFromEmbeddedPage(page: StatusPageData) {
    if (Array.isArray(page.services)) {
      const services = page.services;
      this.servicesMap.update(map => ({ ...map, [page.id]: services }));
    }
    if (Array.isArray(page.incidents)) {
      const incidents = page.incidents;
      this.incidentsMap.update(map => ({ ...map, [page.id]: incidents }));
    }
  }

  fetchAllIncidents(pages: StatusPageData[]) {
    if (!Array.isArray(pages)) return;
    pages.forEach(page => {
      this.getIncidents(page.id).subscribe({
        next: incidents => {
          this.incidentsMap.update(map => ({ ...map, [page.id]: incidents }));
        },
        error: err => console.error('Error fetching incidents for status page:', page.id, err),
      });
    });
  }

  fetchAllServices(pages: StatusPageData[]) {
    if (!Array.isArray(pages)) return;
    pages.forEach(page => {
      this.getServices(page.id).subscribe({
        next: services => {
          this.servicesMap.update(map => ({ ...map, [page.id]: services }));
        },
        error: err => console.error('Error fetching services for status page:', page.id, err),
      });
    });
  }

  getAllEndpoints() {
    return this.http.get<EndpointData[]>(API_ENDPOINTS.SYSTEM_STATUS.ENDPOINTS);
  }

  getStatusPages() {
    return this.http.get<StatusPageData[]>(API_ENDPOINTS.SYSTEM_STATUS.STATUS_PAGES, {
      withCredentials: true,
    });
  }

  getStatusPageBySlug(slug: string) {
    return this.http.get<StatusPageData>(
      `${API_ENDPOINTS.SYSTEM_STATUS.STATUS_PAGES}/slug/${slug}`,
      { withCredentials: true },
    );
  }

  createStatusPage(data: {
    title: string;
    slug: string;
    description?: string;
    is_published?: boolean;
    google_analytics_id?: string;
    microsoft_clarity_id?: string;
    cloudflare_analytics_id?: string;
  }) {
    return this.http.post<StatusPageData>(API_ENDPOINTS.SYSTEM_STATUS.STATUS_PAGES, data, {
      withCredentials: true,
    });
  }

  updateStatusPage(
    pageId: string,
    data: {
      title: string;
      slug: string;
      description?: string;
      is_published?: boolean;
      google_analytics_id?: string;
      microsoft_clarity_id?: string;
      cloudflare_analytics_id?: string;
    },
  ) {
    return this.http.put<StatusPageData>(
      `${API_ENDPOINTS.SYSTEM_STATUS.STATUS_PAGES}/${pageId}`,
      data,
      { withCredentials: true },
    );
  }

  deleteStatusPage(pageId: string) {
    return this.http.delete(`${API_ENDPOINTS.SYSTEM_STATUS.STATUS_PAGES}/${pageId}`, {
      withCredentials: true,
    });
  }

  getServices(pageId: string) {
    return this.http.get<MonitoredServiceData[]>(
      `${API_ENDPOINTS.SYSTEM_STATUS.STATUS_PAGES}/${pageId}/services`,
      { withCredentials: true },
    );
  }

  addService(pageId: string, data: { name: string; url: string }) {
    return this.http.post<MonitoredServiceData>(
      `${API_ENDPOINTS.SYSTEM_STATUS.STATUS_PAGES}/${pageId}/services`,
      data,
      { withCredentials: true },
    );
  }

  deleteService(serviceId: string) {
    return this.http.delete(`${API_ENDPOINTS.SYSTEM_STATUS.SERVICES}/${serviceId}`, {
      withCredentials: true,
    });
  }

  getIncidents(pageId: string) {
    return this.http.get<IncidentData[]>(
      `${API_ENDPOINTS.SYSTEM_STATUS.STATUS_PAGES}/${pageId}/incidents`,
      { withCredentials: true },
    );
  }

  createIncident(pageId: string, data: { title: string; message: string; status: string }) {
    return this.http.post<IncidentData>(
      `${API_ENDPOINTS.SYSTEM_STATUS.STATUS_PAGES}/${pageId}/incidents`,
      data,
      { withCredentials: true },
    );
  }

  deleteIncident(incidentId: string) {
    return this.http.delete(`${API_ENDPOINTS.SYSTEM_STATUS.INCIDENTS}/${incidentId}`, {
      withCredentials: true,
    });
  }

  getIntegrations() {
    return this.http.get<IntegrationData[]>(
      `${API_ENDPOINTS.SYSTEM_STATUS.STATUS_PAGES.replace('status_pages', 'integrations')}`,
      { withCredentials: true },
    );
  }

  getGoogleAuthUrl() {
    return this.http.get<{ url: string; redirect_uri?: string }>(
      `${API_ENDPOINTS.SYSTEM_STATUS.STATUS_PAGES.replace('status_pages', 'integrations/google/auth-url')}`,
      { withCredentials: true },
    );
  }

  saveClarityIntegration(data: { project_id: string; api_key: string }) {
    return this.http.post<IntegrationData>(
      `${API_ENDPOINTS.SYSTEM_STATUS.STATUS_PAGES.replace('status_pages', 'integrations/clarity')}`,
      data,
      { withCredentials: true },
    );
  }

  saveCloudflareIntegration(data: { project_id: string; api_key: string }) {
    return this.http.post<IntegrationData>(
      `${API_ENDPOINTS.SYSTEM_STATUS.STATUS_PAGES.replace('status_pages', 'integrations/cloudflare')}`,
      data,
      { withCredentials: true },
    );
  }

  deleteIntegration(integrationId: string) {
    return this.http.delete(
      `${API_ENDPOINTS.SYSTEM_STATUS.STATUS_PAGES.replace('status_pages', 'integrations')}/${integrationId}`,
      { withCredentials: true },
    );
  }
}

export interface IntegrationData {
  id: string;
  provider: string;
  active: boolean;
  last_sync: string | null;
  created_at: string;
}
