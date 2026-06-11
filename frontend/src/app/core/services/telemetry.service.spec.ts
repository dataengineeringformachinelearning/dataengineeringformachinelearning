import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TelemetryService, TelemetryPayload } from './telemetry.service';
import { API_ENDPOINTS } from '../constants/api.constants';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('TelemetryService', () => {
  let service: TelemetryService;
  let httpMock: HttpTestingController;
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    
    // Stub localStorage
    const mockLocalStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; }
    };
    vi.stubGlobal('localStorage', mockLocalStorage);
    
    // Stub navigator.onLine
    vi.stubGlobal('navigator', { onLine: true });

    TestBed.configureTestingModule({
      providers: [
        TelemetryService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    });

    service = TestBed.inject(TelemetryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.unstubAllGlobals();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send payload when online', () => {
    const payload: TelemetryPayload = {
      url: 'http://test-endpoint.com',
      status_code: 200,
      response_time_ms: 100,
      ip_address: '0.0.0.0',
      is_active: true
    };

    service.reportEndpointStatus(payload);

    const req = httpMock.expectOne(API_ENDPOINTS.TELEMETRY.ENDPOINTS);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({});
  });

  it('should queue payload for offline when navigator is offline', () => {
    vi.stubGlobal('navigator', { onLine: false });

    const payload: TelemetryPayload = {
      url: 'http://test-endpoint.com',
      status_code: 200,
      response_time_ms: 100,
      ip_address: '0.0.0.0',
      is_active: true
    };

    service.reportEndpointStatus(payload);

    // No HTTP request should be sent
    httpMock.expectNone(API_ENDPOINTS.TELEMETRY.ENDPOINTS);

    // Verify it was saved to localStorage
    const queueData = localStorage.getItem('offline_telemetry_queue');
    expect(queueData).toBeTruthy();
    const parsed = JSON.parse(queueData!);
    expect(parsed.length).toBe(1);
    expect(parsed[0]).toEqual(payload);
  });

  it('should queue payload for offline when HTTP send fails', () => {
    const payload: TelemetryPayload = {
      url: 'http://test-endpoint.com',
      status_code: 200,
      response_time_ms: 100,
      ip_address: '0.0.0.0',
      is_active: true
    };

    service.reportEndpointStatus(payload);

    const req = httpMock.expectOne(API_ENDPOINTS.TELEMETRY.ENDPOINTS);
    req.error(new ProgressEvent('error'));

    // Verify it was queued offline after the fail
    const queueData = localStorage.getItem('offline_telemetry_queue');
    expect(queueData).toBeTruthy();
    const parsed = JSON.parse(queueData!);
    expect(parsed.length).toBe(1);
    expect(parsed[0]).toEqual(payload);
  });

  it('should sync offline queue when coming online', () => {
    const payload1: TelemetryPayload = {
      url: 'http://test-endpoint-1.com',
      status_code: 200,
      response_time_ms: 100,
      ip_address: '0.0.0.0',
      is_active: true
    };
    const payload2: TelemetryPayload = {
      url: 'http://test-endpoint-2.com',
      status_code: 500,
      response_time_ms: 200,
      ip_address: '0.0.0.0',
      is_active: false
    };

    // Pre-populate queue
    localStorage.setItem('offline_telemetry_queue', JSON.stringify([payload1, payload2]));

    // Trigger online event listener
    const event = new Event('online');
    window.dispatchEvent(event);

    const reqs = httpMock.match(API_ENDPOINTS.TELEMETRY.ENDPOINTS);
    expect(reqs.length).toBe(2);
    
    // Flush both successfully
    reqs[0].flush({});
    reqs[1].flush({});

    // Verify queue is cleared
    expect(localStorage.getItem('offline_telemetry_queue')).toBeNull();
  });
});
