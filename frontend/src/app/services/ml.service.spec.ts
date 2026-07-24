import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MlService } from './ml.service';
import { API_ENDPOINTS } from '../core/constants/api.constants';
import {
  formatTemporalScore,
  temporalEngineLabel,
  temporalRiskLabel,
} from '../core/utils/temporal.utils';

describe('MlService', () => {
  let service: MlService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MlService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MlService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('stores threat report when anomaly score is missing', () => {
    service.fetchThreatReport('status-page-1');

    const req = httpMock.expectOne(
      `${API_ENDPOINTS.ML.LATEST.replace('/latest', '/threat-intel/report')}?status_page_id=status-page-1`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      status: 'success',
      anomaly_score: null,
      suspicious_ratio: 0.42,
      top_location: 'United States',
      location_weight: 0.77,
      created_at: null,
    });

    expect(service.latestThreatReports()['status-page-1']).toEqual({
      status: 'success',
      anomaly_score: null,
      suspicious_ratio: 0.42,
      top_location: 'United States',
      location_weight: 0.77,
      created_at: null,
      message: undefined,
    });
  });

  it('normalizes empty threat payloads to safe defaults', () => {
    service.fetchThreatReport('status-page-2');

    const req = httpMock.expectOne(
      `${API_ENDPOINTS.ML.LATEST.replace('/latest', '/threat-intel/report')}?status_page_id=status-page-2`,
    );
    req.flush({
      status: 'success',
      message: 'No threat intelligence reports available',
      anomaly_score: null,
      suspicious_ratio: null,
      top_location: null,
      location_weight: null,
      created_at: null,
    });

    expect(service.latestThreatReports()['status-page-2']).toEqual({
      status: 'success',
      anomaly_score: null,
      suspicious_ratio: null,
      top_location: 'N/A',
      location_weight: null,
      created_at: null,
      message: 'No threat intelligence reports available',
    });
  });

  it('seeds persisted temporal metadata without inventing a zero score', () => {
    service.seedFromStatusPage({
      id: 'status-page-3',
      title: 'Example',
      slug: 'example',
      description: '',
      created_at: '2026-07-23T00:00:00Z',
      user_id: null,
      spiking_temporal_forecast: null,
      temporal_status: 'insufficient_data',
      temporal_backend: null,
      temporal_sample_count: 7,
      temporal_scored_at: null,
      uses_norse: null,
    });

    expect(service.latestTemporalInsights()['status-page-3']).toEqual({
      forecast: null,
      status: 'insufficient_data',
      backend: null,
      sampleCount: 7,
      scoredAt: null,
      usesNorse: null,
    });
    expect(service.latestTemporalForecasts()['status-page-3']).toBeNull();
  });

  it('does not relabel current SLA as a predicted SLA', () => {
    service.seedFromStatusPage({
      id: 'current-sla-only',
      title: 'Example',
      slug: 'example',
      description: '',
      created_at: '2026-07-23T00:00:00Z',
      user_id: null,
      cumulative_sla: 99.99,
      overall_uptime: 99.99,
    });

    expect(service.latestStats()['current-sla-only']).toBeUndefined();
  });

  it('treats the legacy zero/false public payload as unknown inference', () => {
    service.seedFromStatusPage({
      id: 'legacy-status-page',
      title: 'Legacy',
      slug: 'legacy',
      description: '',
      created_at: '2026-07-23T00:00:00Z',
      user_id: null,
      spiking_temporal_forecast: 0,
      uses_norse: false,
    });

    const legacy = service.latestTemporalInsights()['legacy-status-page'];
    expect(temporalEngineLabel(legacy)).toBe('Collecting telemetry');
    expect(temporalRiskLabel(legacy)).toBe('Collecting telemetry');
    expect(formatTemporalScore(legacy)).toBe('—');
  });

  it('preserves a ready zero forecast and its backend', () => {
    service.fetchTemporalForecast('status-page-4');

    const req = httpMock.expectOne(
      `${API_ENDPOINTS.ML.TEMPORAL_FORECAST}?status_page_id=status-page-4`,
    );
    req.flush({
      status: 'success',
      spiking_temporal_forecast: 0,
      temporal_status: 'ready',
      temporal_backend: 'gru_mlp_fallback',
      temporal_sample_count: 128,
      temporal_scored_at: '2026-07-23T00:00:00Z',
      uses_norse: false,
    });

    const ready = service.latestTemporalInsights()['status-page-4'];
    expect(ready).toEqual({
      forecast: 0,
      status: 'ready',
      backend: 'gru_mlp_fallback',
      sampleCount: 128,
      scoredAt: '2026-07-23T00:00:00Z',
      usesNorse: false,
    });
    expect(formatTemporalScore(ready)).toBe('0.00');
    expect(temporalRiskLabel(ready)).toBe('Low risk');
    expect(service.latestTemporalForecasts()['status-page-4']).toBe(0);
    expect(service.latestTemporalUsesNorse()['status-page-4']).toBe(false);
  });

  it('treats explicit null temporal metadata as a clear, not a missing field', () => {
    service.seedFromStatusPage({
      id: 'status-page-5',
      title: 'Example',
      slug: 'example',
      description: '',
      created_at: '2026-07-23T00:00:00Z',
      user_id: null,
      spiking_temporal_forecast: 8,
      temporal_status: 'ready',
      temporal_backend: 'norse_lif',
      temporal_sample_count: 128,
      temporal_scored_at: '2026-07-23T00:00:00Z',
      uses_norse: true,
    });
    service.fetchTemporalForecast('status-page-5');

    const req = httpMock.expectOne(
      `${API_ENDPOINTS.ML.TEMPORAL_FORECAST}?status_page_id=status-page-5`,
    );
    req.flush({
      status: 'success',
      spiking_temporal_forecast: null,
      temporal_status: 'insufficient_data',
      temporal_backend: null,
      temporal_sample_count: 3,
      temporal_scored_at: null,
      uses_norse: null,
    });

    expect(service.latestTemporalInsights()['status-page-5']).toEqual({
      forecast: null,
      status: 'insufficient_data',
      backend: null,
      sampleCount: 3,
      scoredAt: null,
      usesNorse: null,
    });
  });
});
