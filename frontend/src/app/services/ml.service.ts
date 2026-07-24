import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/constants/api.constants';
import type { StatusPageData } from './monitor.service';
import type { TemporalInsight } from '../core/utils/temporal.utils';

export interface TrainingResponse {
  status: string;
  message?: string;
  average_sla: number | null;
  loss?: number;
  run_id?: string;
  created_at?: string;
}

export interface TemporalForecastResponse {
  status: string;
  message?: string;
  spiking_temporal_forecast: number | null;
  temporal_status?: string | null;
  temporal_backend?: string | null;
  temporal_sample_count?: number | null;
  temporal_scored_at?: string | null;
  uses_norse?: boolean | null;
  created_at?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class MlService {
  private http = inject(HttpClient);

  public latestStat = signal<number | null>(null);
  public latestStats = signal<Record<string, number | null>>({});
  public latestTemporalInsights = signal<Record<string, TemporalInsight>>({});
  public latestTemporalForecasts = computed<Record<string, number | null>>(() => {
    const forecasts: Record<string, number | null> = {};
    for (const [pageId, insight] of Object.entries(this.latestTemporalInsights())) {
      forecasts[pageId] = insight.forecast;
    }
    return forecasts;
  });
  public latestTemporalUsesNorse = computed<Record<string, boolean | null>>(() => {
    const flags: Record<string, boolean | null> = {};
    for (const [pageId, insight] of Object.entries(this.latestTemporalInsights())) {
      flags[pageId] = insight.usesNorse;
    }
    return flags;
  });
  public isTraining = signal<boolean>(false);
  public trainError = signal<string | null>(null);

  /** Seed gauges from public status-page intelligence (no auth required). */
  seedFromStatusPage(page: StatusPageData): void {
    const pageId = page.id;
    if (!pageId) return;
    this.latestTemporalInsights.update(insights => ({
      ...insights,
      [pageId]: {
        forecast: page.spiking_temporal_forecast ?? null,
        status: page.temporal_status ?? null,
        backend: page.temporal_backend ?? null,
        sampleCount: page.temporal_sample_count ?? null,
        scoredAt: page.temporal_scored_at ?? null,
        usesNorse: page.uses_norse ?? null,
      },
    }));
    if (page.threat_anomaly_score != null || page.threat_suspicious_ratio != null) {
      this.latestThreatReports.update(reports => ({
        ...reports,
        [pageId]: this.normalizeThreatReport({
          status: 'success',
          anomaly_score: page.threat_anomaly_score ?? null,
          suspicious_ratio: page.threat_suspicious_ratio ?? null,
          top_location: 'N/A',
          location_weight: 0,
          created_at: null,
          message:
            page.threat_anomaly_score == null && page.threat_suspicious_ratio == null
              ? 'Pending telemetry'
              : undefined,
        }),
      }));
    }
  }

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

  fetchTemporalForecast(statusPageId?: string): void {
    const url = statusPageId
      ? `${API_ENDPOINTS.ML.TEMPORAL_FORECAST}?status_page_id=${statusPageId}`
      : API_ENDPOINTS.ML.TEMPORAL_FORECAST;

    this.http.get<TemporalForecastResponse>(url).subscribe({
      next: data => {
        const forecast =
          data.spiking_temporal_forecast !== null && data.spiking_temporal_forecast !== undefined
            ? data.spiking_temporal_forecast
            : null;
        if (statusPageId) {
          const prior = this.latestTemporalInsights()[statusPageId];
          const hasOwn = (key: keyof TemporalForecastResponse): boolean =>
            Object.prototype.hasOwnProperty.call(data, key);
          this.latestTemporalInsights.update(insights => ({
            ...insights,
            [statusPageId]: {
              forecast,
              status: hasOwn('temporal_status')
                ? (data.temporal_status ?? null)
                : (prior?.status ?? null),
              backend: hasOwn('temporal_backend')
                ? (data.temporal_backend ?? null)
                : (prior?.backend ?? null),
              sampleCount: hasOwn('temporal_sample_count')
                ? (data.temporal_sample_count ?? null)
                : (prior?.sampleCount ?? null),
              scoredAt: hasOwn('temporal_scored_at')
                ? (data.temporal_scored_at ?? null)
                : hasOwn('created_at')
                  ? (data.created_at ?? null)
                  : (prior?.scoredAt ?? null),
              usesNorse: hasOwn('uses_norse')
                ? (data.uses_norse ?? null)
                : (prior?.usesNorse ?? null),
            },
          }));
        }
      },
      error: err => console.error('Error fetching temporal forecast:', err),
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
      anomaly_score: data.anomaly_score ?? null,
      top_location: data.top_location ?? 'N/A',
      location_weight: data.location_weight ?? null,
      suspicious_ratio: data.suspicious_ratio ?? null,
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
            this.latestThreatReports.update(reports => ({
              ...reports,
              [statusPageId]: normalized,
            }));
          } else {
            this.latestThreatReport.set(normalized);
          }
        } else if (statusPageId) {
          this.latestThreatReports.update(reports => ({
            ...reports,
            [statusPageId]: this.normalizeThreatReport({
              status: 'success',
              suspicious_ratio: 0,
              anomaly_score: 0,
              top_location: 'N/A',
              location_weight: 0,
              created_at: null,
              message: data?.message ?? 'Pending telemetry',
            }),
          }));
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

  fetchStixReport(statusPageId?: string): Observable<unknown> {
    const baseUrl = API_ENDPOINTS.ML.LATEST.replace('/latest', '/threat-intel/stix');
    const url = statusPageId ? `${baseUrl}?status_page_id=${statusPageId}` : baseUrl;
    return this.http.get<unknown>(url);
  }

  submitToIsac(destination: string, statusPageId?: string): Observable<unknown> {
    const url = API_ENDPOINTS.ML.LATEST.replace('/latest', '/threat-intel/submit-isac');
    const body = { destination, status_page_id: statusPageId || null };
    return this.http.post<unknown>(url, body);
  }

  fetchSocStatus(): Observable<unknown> {
    const url = API_ENDPOINTS.ML.LATEST.replace('/latest', '/compliance/soc-status');
    return this.http.get<unknown>(url);
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
