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

@Injectable({
  providedIn: 'root'
})
export class MonitorService {
  private http = inject(HttpClient);

  getAllEndpoints() {
    return this.http.get<EndpointData[]>(API_ENDPOINTS.SYSTEM_STATUS.ENDPOINTS);
  }
}
