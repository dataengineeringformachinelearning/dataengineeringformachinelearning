import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class HealthcheckService {
  private http = inject(HttpClient);

  getHealthcheck() {
    return this.http.get<{status: string}>(`${environment.backendUrl}${environment.healthCheckEndpoint}`);
  }
}
