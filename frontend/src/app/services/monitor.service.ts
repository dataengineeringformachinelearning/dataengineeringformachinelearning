import { Injectable, inject } from '@angular/core';
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
  created_at: string;
  user_id: number | null;
}

export interface MonitoredServiceData {
  id: string;
  name: string;
  url: string;
  status_page_id: string;
  created_at: string;
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
  providedIn: 'root'
})
export class MonitorService {
  private http = inject(HttpClient);

  getAllEndpoints() {
    return this.http.get<EndpointData[]>(API_ENDPOINTS.SYSTEM_STATUS.ENDPOINTS);
  }

  getStatusPages() {
    return this.http.get<StatusPageData[]>(API_ENDPOINTS.SYSTEM_STATUS.STATUS_PAGES, { withCredentials: true });
  }

  createStatusPage(data: { title: string, slug: string, description?: string }) {
    return this.http.post<StatusPageData>(API_ENDPOINTS.SYSTEM_STATUS.STATUS_PAGES, data, { withCredentials: true });
  }

  getServices(pageId: string) {
    return this.http.get<MonitoredServiceData[]>(`${API_ENDPOINTS.SYSTEM_STATUS.STATUS_PAGES}/${pageId}/services`, { withCredentials: true });
  }

  addService(pageId: string, data: { name: string, url: string }) {
    return this.http.post<MonitoredServiceData>(`${API_ENDPOINTS.SYSTEM_STATUS.STATUS_PAGES}/${pageId}/services`, data, { withCredentials: true });
  }

  deleteService(serviceId: string) {
    return this.http.delete(`${API_ENDPOINTS.SYSTEM_STATUS.SERVICES}/${serviceId}`, { withCredentials: true });
  }

  getIncidents(pageId: string) {
    return this.http.get<IncidentData[]>(`${API_ENDPOINTS.SYSTEM_STATUS.STATUS_PAGES}/${pageId}/incidents`, { withCredentials: true });
  }

  createIncident(pageId: string, data: { title: string, message: string, status: string }) {
    return this.http.post<IncidentData>(`${API_ENDPOINTS.SYSTEM_STATUS.STATUS_PAGES}/${pageId}/incidents`, data, { withCredentials: true });
  }

  deleteIncident(incidentId: string) {
    return this.http.delete(`${API_ENDPOINTS.SYSTEM_STATUS.INCIDENTS}/${incidentId}`, { withCredentials: true });
  }
}
