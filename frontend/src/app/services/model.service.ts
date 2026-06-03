import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  public latestStat = signal<number | null>(null);
  public isTraining = signal<boolean>(false);
  public trainError = signal<string | null>(null);

  fetchLatestStat(): void {
    this.http.get<TrainingResponse>(`${this.apiUrl}/latest`).subscribe({
      next: data => {
        if (data.average_sla !== null && data.average_sla !== undefined) {
          this.latestStat.set(data.average_sla);
        }
      },
      error: err => console.error('Error fetching latest stat:', err)
    });
  }

  trainModel(): void {
    this.isTraining.set(true);
    this.trainError.set(null);
    
    this.http.post<TrainingResponse>(`${this.apiUrl}/train`, {}).subscribe({
      next: res => {
        setTimeout(() => {
          this.isTraining.set(false);
          if (res && res.average_sla !== null && res.average_sla !== undefined) {
            this.latestStat.set(res.average_sla);
          }
        }, 500);
      },
      error: err => {
        setTimeout(() => {
          console.error('Train model error:', err);
          this.isTraining.set(false);
          this.trainError.set('Failed to train model.');
        }, 500);
      }
    });
  }
}
