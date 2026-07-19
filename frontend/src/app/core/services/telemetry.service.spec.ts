import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TelemetryService, TelemetryPayload } from './telemetry.service';
import { API_ENDPOINTS } from '../constants/api.constants';
import { environment } from '../../../environments/environment';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('TelemetryService', () => {
  let service: TelemetryService;
  let httpMock: HttpTestingController;
  let store: Record<string, string>;

  beforeEach(() => {
    environment.enableLegacyPlaintextTelemetry = true;
    store = {};

    // Stub localStorage
    const mockLocalStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
    vi.stubGlobal('localStorage', mockLocalStorage);

    // Stub navigator.onLine
    vi.stubGlobal('navigator', { onLine: true });

    TestBed.configureTestingModule({
      providers: [TelemetryService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(TelemetryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.unstubAllGlobals();
    environment.enableLegacyPlaintextTelemetry = false;
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
      is_active: true,
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
      is_active: true,
    };

    service.reportEndpointStatus(payload);

    // No HTTP request should be sent
    httpMock.expectNone(API_ENDPOINTS.TELEMETRY.ENDPOINTS);

    // Verify it was saved to localStorage
    const queueData = localStorage.getItem('offline_telemetry_queue');
    expect(queueData).toBeTruthy();
    const parsed = JSON.parse(queueData!);
    expect(parsed.length).toBe(1);
    expect(parsed[0].payload).toEqual(payload);
    expect(parsed[0].queuedAt).toEqual(expect.any(Number));
  });

  it('should queue payload for offline when HTTP send fails', () => {
    const payload: TelemetryPayload = {
      url: 'http://test-endpoint.com',
      status_code: 200,
      response_time_ms: 100,
      ip_address: '0.0.0.0',
      is_active: true,
    };

    service.reportEndpointStatus(payload);

    const req = httpMock.expectOne(API_ENDPOINTS.TELEMETRY.ENDPOINTS);
    req.error(new ProgressEvent('error'));

    // Verify it was queued offline after the fail
    const queueData = localStorage.getItem('offline_telemetry_queue');
    expect(queueData).toBeTruthy();
    const parsed = JSON.parse(queueData!);
    expect(parsed.length).toBe(1);
    expect(parsed[0].payload).toEqual(payload);
  });

  it('should sync offline queue when coming online', async () => {
    const payload1: TelemetryPayload = {
      url: 'http://test-endpoint-1.com',
      status_code: 200,
      response_time_ms: 100,
      ip_address: '0.0.0.0',
      is_active: true,
    };
    const payload2: TelemetryPayload = {
      url: 'http://test-endpoint-2.com',
      status_code: 500,
      response_time_ms: 200,
      ip_address: '0.0.0.0',
      is_active: false,
    };

    // Pre-populate queue
    const queuedAt = Date.now();
    localStorage.setItem(
      'offline_telemetry_queue',
      JSON.stringify([
        { queuedAt, payload: payload1 },
        { queuedAt, payload: payload2 },
      ]),
    );

    // Trigger online event listener
    const event = new Event('online');
    window.dispatchEvent(event);

    const first = httpMock.expectOne(API_ENDPOINTS.TELEMETRY.ENDPOINTS);
    first.flush({});
    await Promise.resolve();
    const second = httpMock.expectOne(API_ENDPOINTS.TELEMETRY.ENDPOINTS);
    second.flush({});

    // Wait for the async queue processing to finish
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify queue is cleared
    expect(localStorage.getItem('offline_telemetry_queue')).toBeNull();
  });

  it('bounds the legacy queue and drops expired entries', () => {
    vi.stubGlobal('navigator', { onLine: false });
    const payload: TelemetryPayload = {
      url: 'http://test-endpoint.com',
      status_code: 200,
      response_time_ms: 100,
      ip_address: '0.0.0.0',
      is_active: true,
    };

    for (let index = 0; index < 105; index += 1) {
      service.reportEndpointStatus({ ...payload, url: `${payload.url}/${index}` });
    }
    const bounded = JSON.parse(localStorage.getItem('offline_telemetry_queue')!);
    expect(bounded).toHaveLength(100);

    localStorage.setItem(
      'offline_telemetry_queue',
      JSON.stringify([{ queuedAt: Date.now() - 25 * 60 * 60 * 1000, payload }]),
    );
    window.dispatchEvent(new Event('online'));
    expect(localStorage.getItem('offline_telemetry_queue')).toBeNull();
    httpMock.expectNone(API_ENDPOINTS.TELEMETRY.ENDPOINTS);
  });
});

describe('TelemetryService disabled-by-default lane', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    environment.enableLegacyPlaintextTelemetry = false;
    const store: Record<string, string> = {
      offline_telemetry_queue: JSON.stringify([{ legacy: 'plaintext' }]),
    };
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    });
    vi.stubGlobal('navigator', { onLine: true });
    TestBed.configureTestingModule({
      providers: [TelemetryService, provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.unstubAllGlobals();
  });

  it('purges legacy plaintext data and performs no HTTP call', () => {
    const service = TestBed.inject(TelemetryService);
    service.reportEndpointStatus({
      url: 'https://example.test',
      status_code: 200,
      response_time_ms: 10,
      ip_address: '0.0.0.0',
      is_active: true,
    });

    httpMock.expectNone(API_ENDPOINTS.TELEMETRY.ENDPOINTS);
    expect(localStorage.getItem('offline_telemetry_queue')).toBeNull();
  });
});
