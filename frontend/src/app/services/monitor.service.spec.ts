import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MonitorService } from './monitor.service';
import { API_ENDPOINTS } from '../core/constants/api.constants';

describe('MonitorService', () => {
  let service: MonitorService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MonitorService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MonitorService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch all endpoints', () => {
    const mockData = [
      {
        id: '1',
        url: 'http://test.com',
        last_tested: '',
        status_code: 200,
        response_time: '50ms',
        ip_address: '',
        is_active: true,
      },
    ];

    service.getAllEndpoints().subscribe(data => {
      expect(data.length).toBe(1);
      expect(data[0].url).toBe('http://test.com');
    });

    const req = httpMock.expectOne(API_ENDPOINTS.SYSTEM_STATUS.ENDPOINTS);
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });

  it('should fetch status pages', () => {
    const mockPages = [
      {
        id: 'p1',
        title: 'Platform Status',
        slug: 'platform-status',
        description: '',
        created_at: '',
        user_id: 1,
      },
    ];

    service.getStatusPages().subscribe(pages => {
      expect(pages.length).toBe(1);
      expect(pages[0].slug).toBe('platform-status');
    });

    const req = httpMock.expectOne(API_ENDPOINTS.SYSTEM_STATUS.STATUS_PAGES);
    expect(req.request.method).toBe('GET');
    req.flush(mockPages);
  });

  it('should create a status page', () => {
    const payload = { title: 'New Page', slug: 'new-slug' };
    const mockCreated = {
      id: 'p2',
      title: 'New Page',
      slug: 'new-slug',
      description: '',
      created_at: '',
      user_id: 1,
    };

    service.createStatusPage(payload).subscribe(page => {
      expect(page.id).toBe('p2');
    });

    const req = httpMock.expectOne(API_ENDPOINTS.SYSTEM_STATUS.STATUS_PAGES);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockCreated);
  });

  it('should delete a status page', () => {
    service.deleteStatusPage('p2').subscribe(res => {
      expect(res).toBeTruthy();
    });

    const req = httpMock.expectOne(`${API_ENDPOINTS.SYSTEM_STATUS.STATUS_PAGES}/p2`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true });
  });

  it('should fetch incidents for a status page', () => {
    const mockIncidents = [
      {
        id: 'i1',
        title: 'DB Offline',
        message: 'Down',
        status: 'Investigating',
        status_page_id: 'p1',
        created_at: '',
        updated_at: '',
      },
    ];

    service.getIncidents('p1').subscribe(incs => {
      expect(incs.length).toBe(1);
      expect(incs[0].title).toBe('DB Offline');
    });

    const req = httpMock.expectOne(`${API_ENDPOINTS.SYSTEM_STATUS.STATUS_PAGES}/p1/incidents`);
    expect(req.request.method).toBe('GET');
    req.flush(mockIncidents);
  });
});
