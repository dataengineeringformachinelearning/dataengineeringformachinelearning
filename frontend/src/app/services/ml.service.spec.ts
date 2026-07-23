import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MlService } from './ml.service';
import { API_ENDPOINTS } from '../core/constants/api.constants';

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
});
