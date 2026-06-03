import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

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
    return this.http.get<EndpointData[]>(`${environment.backendUrl}/api/monitor/endpoints`);
  }
}
