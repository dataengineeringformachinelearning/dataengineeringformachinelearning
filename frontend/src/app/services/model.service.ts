import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TrainingResponse {
  status: string;
  message?: string;
  average_sla: number | null;
  loss?: number;
  run_id?: string;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ModelService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.backendUrl}/api/v1/model`;

  trainModel(): Observable<TrainingResponse> {
    return this.http.post<TrainingResponse>(`${this.apiUrl}/train`, {});
  }

  getLatestTraining(): Observable<TrainingResponse> {
    return this.http.get<TrainingResponse>(`${this.apiUrl}/latest`);
  }
}
