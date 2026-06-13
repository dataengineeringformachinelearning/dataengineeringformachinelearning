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
  created_at: string;
  user_id: number | null;
  cumulative_sla?: number;
  overall_uptime?: number;
  uptime_history?: { status: string; uptime: number }[];
}

export interface MonitoredServiceData {
  id: string;
  name: string;
  url: string;
  status_page_id: string;
  created_at: string;
  status?: string;
  sla?: number;
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

  fetchAllIncidents(pages: StatusPageData[]) {
    pages.forEach(page => {
      this.getIncidents(page.id).subscribe({
        next: incidents => {
          this.incidentsMap.update(map => ({ ...map, [page.id]: incidents }));
        },
        error: err => console.error(`Error fetching incidents for ${page.id}:`, err),
      });
    });
  }

  fetchAllServices(pages: StatusPageData[]) {
    pages.forEach(page => {
      this.getServices(page.id).subscribe({
        next: services => {
          this.servicesMap.update(map => ({ ...map, [page.id]: services }));
        },
        error: err => console.error(`Error fetching services for ${page.id}:`, err),
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
  }) {
    return this.http.post<StatusPageData>(API_ENDPOINTS.SYSTEM_STATUS.STATUS_PAGES, data, {
      withCredentials: true,
    });
  }

  updateStatusPage(
    pageId: string,
    data: { title: string; slug: string; description?: string; is_published?: boolean },
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
}
