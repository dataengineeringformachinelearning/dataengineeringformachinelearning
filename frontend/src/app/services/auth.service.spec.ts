import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should check auth and set signals on success', async () => {
    const checkPromise = service.checkAuth();

    const req = httpMock.expectOne(`${environment.backendUrl}/api/v1/auth/user`);
    expect(req.request.method).toBe('GET');
    req.flush({ status: 'success', user_id: 42 });

    await checkPromise;

    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUserId()).toBe(42);
  });

  it('should check auth and clear signals on failure', async () => {
    const checkPromise = service.checkAuth();

    const req = httpMock.expectOne(`${environment.backendUrl}/api/v1/auth/user`);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    await checkPromise;

    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUserId()).toBeNull();
  });

  it('should login and set signals on success', async () => {
    const loginPromise = service.login({ username: 'user', password: 'pwd' });

    const req = httpMock.expectOne(`${environment.backendUrl}/api/v1/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush({ status: 'success', user_id: 100 });

    const result = await loginPromise;

    expect(result).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUserId()).toBe(100);
  });

  it('should logout and clear signals', async () => {
    service.isAuthenticated.set(true);
    service.currentUserId.set(42);

    const logoutPromise = service.logout();

    const req = httpMock.expectOne(`${environment.backendUrl}/api/v1/auth/logout`);
    expect(req.request.method).toBe('POST');
    req.flush({ status: 'success' });

    await logoutPromise;

    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUserId()).toBeNull();
  });
});
