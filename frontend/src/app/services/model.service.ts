import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_ENDPOINTS } from '../core/constants/api.constants';

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

  public latestStat = signal<number | null>(null);
  public latestStats = signal<Record<string, number | null>>({});
  public isTraining = signal<boolean>(false);
  public trainError = signal<string | null>(null);

  fetchLatestStat(statusPageId?: string): void {
    const url = statusPageId 
      ? `${API_ENDPOINTS.MODEL.LATEST}?status_page_id=${statusPageId}` 
      : API_ENDPOINTS.MODEL.LATEST;

    this.http.get<TrainingResponse>(url).subscribe({
      next: data => {
        const sla = (data.average_sla !== null && data.average_sla !== undefined) ? data.average_sla : null;
        if (statusPageId) {
          this.latestStats.update(stats => ({ ...stats, [statusPageId]: sla }));
        } else if (sla !== null) {
          this.latestStat.set(sla);
        }
      },
      error: err => console.error('Error fetching latest stat:', err)
    });
  }

  trainModel(): void {
    this.isTraining.set(true);
    this.trainError.set(null);
    
    this.http.post<TrainingResponse>(API_ENDPOINTS.MODEL.TRAIN, {}).subscribe({
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
