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
  providedIn: 'root',
})
export class MlService {
  private http = inject(HttpClient);

  public latestStat = signal<number | null>(null);
  public latestStats = signal<Record<string, number | null>>({});
  public isTraining = signal<boolean>(false);
  public trainError = signal<string | null>(null);

  fetchLatestStat(statusPageId?: string): void {
    const url = statusPageId
      ? `${API_ENDPOINTS.ML.LATEST}?status_page_id=${statusPageId}`
      : API_ENDPOINTS.ML.LATEST;

    this.http.get<TrainingResponse>(url).subscribe({
      next: data => {
        const sla =
          data.average_sla !== null && data.average_sla !== undefined ? data.average_sla : null;
        if (statusPageId) {
          this.latestStats.update(stats => ({ ...stats, [statusPageId]: sla }));
        } else if (sla !== null) {
          this.latestStat.set(sla);
        }
      },
      error: err => console.error('Error fetching latest stat:', err),
    });
  }

  trainModel(): void {
    this.isTraining.set(true);
    this.trainError.set(null);

    this.http.post<TrainingResponse>(API_ENDPOINTS.ML.TRAIN, {}).subscribe({
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
      },
    });
  }

  public latestThreatReport = signal<ThreatReportResponse | null>(null);
  public latestThreatReports = signal<Record<string, ThreatReportResponse | null>>({});
  public isTrainingThreat = signal<boolean>(false);

  private normalizeThreatReport(data: ThreatReportResponse): ThreatReportResponse {
    return {
      status: data.status,
      anomaly_score: data.anomaly_score ?? 0,
      top_location: data.top_location ?? 'N/A',
      location_weight: data.location_weight ?? 0,
      suspicious_ratio: data.suspicious_ratio ?? 0,
      created_at: data.created_at ?? null,
      message: data.message,
    };
  }

  fetchThreatReport(statusPageId?: string): void {
    let url = API_ENDPOINTS.ML.LATEST.replace('/latest', '/threat-intel/report');
    if (statusPageId) {
      url += `?status_page_id=${statusPageId}`;
    }
    this.http.get<ThreatReportResponse>(url).subscribe({
      next: data => {
        if (data && data.status === 'success') {
          const normalized = this.normalizeThreatReport(data);
          if (statusPageId) {
            this.latestThreatReports.update(reports => ({ ...reports, [statusPageId]: normalized }));
          } else {
            this.latestThreatReport.set(normalized);
          }
        }
      },
      error: err => console.error('Error fetching threat report:', err),
    });
  }

  trainThreatModel(): void {
    this.isTrainingThreat.set(true);
    const url = API_ENDPOINTS.ML.LATEST.replace('/latest', '/threat-intel/train');
    this.http.post<ThreatReportResponse>(url, {}).subscribe({
      next: res => {
        this.isTrainingThreat.set(false);
        if (res && res.status === 'success') {
          this.latestThreatReport.set(this.normalizeThreatReport(res));
        }
      },
      error: err => {
        console.error('Error training threat model:', err);
        this.isTrainingThreat.set(false);
      },
    });
  }

  fetchStixReport(statusPageId?: string) {
    const baseUrl = API_ENDPOINTS.ML.LATEST.replace('/latest', '/threat-intel/stix');
    const url = statusPageId ? `${baseUrl}?status_page_id=${statusPageId}` : baseUrl;
    return this.http.get<any>(url);
  }

  submitToIsac(destination: string, statusPageId?: string) {
    const url = API_ENDPOINTS.ML.LATEST.replace('/latest', '/threat-intel/submit-isac');
    const body = { destination, status_page_id: statusPageId || null };
    return this.http.post<any>(url, body);
  }

  fetchSocStatus() {
    const url = API_ENDPOINTS.ML.LATEST.replace('/latest', '/compliance/soc-status');
    return this.http.get<any>(url);
  }
}

export interface ThreatReportResponse {
  status: string;
  anomaly_score: number | null;
  top_location: string | null;
  location_weight: number | null;
  suspicious_ratio: number | null;
  created_at: string | null;
  message?: string;
}
